export interface AddServiceItemCommandDto {
  catalogId: string;
  hardwareItemId?: string;
  sourceLocationId?: string;
  quantity?: number;
  unitPrice: number;
  userId: string;
  userRole: string;
  userLocationId?: string | null;
}
