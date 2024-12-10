import { SalesforceAuthError } from './errors';

export interface SalesforceRestConfig {
  /**
   * The Salesforce API version to use
   * @default "59.0"
   */
  apiVersion?: string;
  /**
   * The instance URL for REST API calls
   */
  instanceUrl: string;
}

export interface QueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export class SalesforceRestClient {
  private baseUrl: string;

  constructor(
    private config: SalesforceRestConfig,
    private getAccessToken: () => Promise<string | null>
  ) {
    this.baseUrl = `${config.instanceUrl}/services/data/v${
      config.apiVersion || '59.0'
    }`;
  }

  private async getHeaders(): Promise<Headers> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new SalesforceAuthError('not_authenticated');
    }
    return new Headers({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Execute a SOQL query
   */
  async query<T>(soql: string): Promise<QueryResult<T>> {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${this.baseUrl}/query?q=${encodeURIComponent(soql)}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Query failed: ' + response.statusText);
    }
    
    return response.json();
  }

  /**
   * Create a new record
   */
  async create<T>(objectName: string, data: Partial<T>): Promise<{ id: string; success: boolean }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/sobjects/${objectName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Create failed: ' + response.statusText);
    }

    return response.json();
  }

  /**
   * Update an existing record
   */
  async update<T>(objectName: string, id: string, data: Partial<T>): Promise<void> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/sobjects/${objectName}/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Update failed: ' + response.statusText);
    }
  }

  /**
   * Delete a record
   */
  async delete(objectName: string, id: string): Promise<void> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/sobjects/${objectName}/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Delete failed: ' + response.statusText);
    }
  }

  /**
   * Retrieve a record by ID
   */
  async retrieve<T>(objectName: string, id: string, fields?: string[]): Promise<T> {
    const headers = await this.getHeaders();
    const url = fields 
      ? `${this.baseUrl}/sobjects/${objectName}/${id}?fields=${fields.join(',')}`
      : `${this.baseUrl}/sobjects/${objectName}/${id}`;
      
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error('Retrieve failed: ' + response.statusText);
    }

    return response.json();
  }
}
