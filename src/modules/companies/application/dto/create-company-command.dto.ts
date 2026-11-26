export interface CreateCompanyCommandDto {
  name: string;
  ruc: string;
  address: string;
  active?: boolean;
}
