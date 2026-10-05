// Prisma ids are BigInt, which JSON.stringify rejects. Serialize them as strings
// (not numbers) so ids beyond 2^53 never lose precision on the client.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

export {};
