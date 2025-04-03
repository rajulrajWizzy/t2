declare module 'bcrypt' {
  /**
   * Generate a hash for the given string
   * @param data The string to hash
   * @param saltOrRounds The salt to hash with (if string) or rounds to use when generating salt (if number)
   * @returns A promise that resolves to the hash
   */
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;

  /**
   * Compare a string to a hash to see if they match
   * @param data The string to compare
   * @param encrypted The hash to compare against
   * @returns A promise that resolves to true if match, false otherwise
   */
  export function compare(data: string, encrypted: string): Promise<boolean>;

  /**
   * Generate a salt
   * @param rounds The number of rounds to use (default: 10)
   * @returns A promise that resolves to the salt
   */
  export function genSalt(rounds?: number): Promise<string>;

  /**
   * Get the number of rounds used to generate a hash
   * @param encrypted The hash to check
   * @returns The number of rounds used
   */
  export function getRounds(encrypted: string): number;
} 