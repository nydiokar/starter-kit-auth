import * as argon2 from 'argon2';

export interface ArgonParams {
  memoryCost: number; // ARGON2_MEMORY
  timeCost: number;   // ARGON2_ITERATIONS
  parallelism: number; // ARGON2_PARALLELISM
}

export async function hashPassword(password: string, pepper: string, params: ArgonParams): Promise<string> {
  return argon2.hash(password + pepper, {
    memoryCost: params.memoryCost,
    timeCost: params.timeCost,
    parallelism: params.parallelism,
  });
}

export async function verifyPassword(hash: string, password: string, pepper: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password + pepper);
  } catch {
    return false;
  }
}

// An arbitrary dummy hash to normalize timing when user is missing
// Generated once via argon2; any valid argon2id hash will do.
export const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$Hqj3s1R3g1p7GgM0qA2w0B0C7m0Yk8mX3m9q7x3k9iU';

