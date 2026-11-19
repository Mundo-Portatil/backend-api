export interface CategoryResponseDto {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  productsCount?: number;
  createdAt: Date;
}
