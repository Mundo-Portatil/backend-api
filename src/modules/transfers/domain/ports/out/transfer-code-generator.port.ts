export const TRANSFER_CODE_GENERATOR = Symbol('TRANSFER_CODE_GENERATOR');

export interface TransferCodeGeneratorPort {
  generateCode(): Promise<string>;
}
