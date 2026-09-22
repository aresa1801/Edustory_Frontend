// types/midtrans-client.d.ts
declare module 'midtrans-client' {
  export interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    billing_address?: Record<string, any>;
    shipping_address?: Record<string, any>;
  }

  export interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
    url?: string;
  }

  export interface Callbacks {
    finish?: string;
    error?: string;
    pending?: string;
  }

  export interface SnapTransactionPayload {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetails[];
    callbacks?: Callbacks;
    enabled_payments?: string[];
    credit_card?: Record<string, any>;
    expiry?: Record<string, any>;
    custom_field1?: string;
    custom_field2?: string;
    custom_field3?: string;
  }

  export interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(config: SnapConfig);
    createTransaction(
      payload: SnapTransactionPayload
    ): Promise<SnapTransactionResponse>;
    createTransactionToken(payload: SnapTransactionPayload): Promise<string>;
    createTransactionRedirectUrl(
      payload: SnapTransactionPayload
    ): Promise<string>;
  }

  export interface CoreApiConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export class CoreApi {
    constructor(config: CoreApiConfig);
    charge(payload: Record<string, any>): Promise<any>;
    capture(payload: Record<string, any>): Promise<any>;
    cardRegister(payload: Record<string, any>): Promise<any>;
    cardToken(payload: Record<string, any>): Promise<any>;
    cardPointInquiry(tokenId: string): Promise<any>;
    status(orderId: string): Promise<any>;
    approve(orderId: string): Promise<any>;
    deny(orderId: string): Promise<any>;
    cancel(orderId: string): Promise<any>;
    expire(orderId: string): Promise<any>;
    refund(orderId: string, payload?: Record<string, any>): Promise<any>;
    refundDirect(orderId: string, payload?: Record<string, any>): Promise<any>;
    notification(notificationPayload: Record<string, any>): Promise<any>;
    transaction: {
      status(orderId: string): Promise<any>;
      approve(orderId: string): Promise<any>;
      cancel(orderId: string): Promise<any>;
      expire(orderId: string): Promise<any>;
      refund(orderId: string, payload?: Record<string, any>): Promise<any>;
    };
  }

  const _default: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };
  export default _default;
  
  // ===== Tambahkan di paling bawah file =====
    declare global {
    interface Window {
        snap?: {
        pay: (
            token: string,
            options?: {
            onSuccess?: (result: any) => void;
            onPending?: (result: any) => void;
            onError?: (result: any) => void;
            onClose?: () => void;
            }
        ) => void;
        embed: (token: string, options: Record<string, any>) => void;
        };
    }
    }
}