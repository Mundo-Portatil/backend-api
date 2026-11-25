export const SERVICE_ORDER_CODE_GENERATOR = Symbol('SERVICE_ORDER_CODE_GENERATOR');

export interface ServiceOrderCodeGeneratorPort {
  generateCode(): Promise<string>;
}
