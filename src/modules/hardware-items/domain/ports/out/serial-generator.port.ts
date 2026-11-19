export const SERIAL_GENERATOR_PORT = Symbol('SERIAL_GENERATOR_PORT');

export interface SerialGeneratorPort {
  generateInternalSerial(): string;
}
