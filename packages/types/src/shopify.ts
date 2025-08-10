export interface ShopifyOAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  associated_user_scope?: string;
  associated_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    account_owner: boolean;
    locale: string;
    collaborator: boolean;
    email_verified: boolean;
  };
}

export interface ShopifyMetaobject {
  id: string;
  type: string;
  fields: MetaobjectField[];
  handle: string;
  created_at: string;
  updated_at: string;
}

export interface MetaobjectField {
  key: string;
  value: string | number | boolean | null;
  type: string;
  reference?: {
    id: string;
    type: string;
  };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
