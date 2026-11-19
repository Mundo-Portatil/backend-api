export interface ValidateSerialsCommandDto {
  serialNumbers: string[];
}

export interface ValidateSerialsResponseDto {
  existingSerials: string[];
  allValid: boolean;
}
