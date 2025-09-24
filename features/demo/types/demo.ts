export interface TradieType {
  id: string;
  label: string;
  description: string;
  businessId: string;
}

export interface DemoSessionEvent {
  id: string;
  type: 'demo.session.start' | 'demo.session.end';
  data: {
    session_id: string;
    tradie_type?: string;
  };
}

export interface DemoConfig {
  businessTypes: TradieType[];
  defaultBusinessType: string;
}
