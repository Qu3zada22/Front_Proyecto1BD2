import { BadRequestException } from '@nestjs/common';
import { ParseMongoIdPipe } from './parse-mongo-id.pipe';
import { Types } from 'mongoose';

describe('ParseMongoIdPipe', () => {
  let pipe: ParseMongoIdPipe;

  beforeEach(() => {
    pipe = new ParseMongoIdPipe();
  });

  it('should return the value unchanged when it is a valid ObjectId', () => {
    const validId = new Types.ObjectId().toString();
    expect(pipe.transform(validId)).toBe(validId);
  });

  it('should throw BadRequestException for a random non-hex string', () => {
    expect(() => pipe.transform('not-an-id')).toThrow(BadRequestException);
    expect(() => pipe.transform('not-an-id')).toThrow(
      "'not-an-id' no es un ObjectId válido",
    );
  });

  it('should throw BadRequestException for a string that is too short', () => {
    expect(() => pipe.transform('abc123')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for an empty string', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('should accept a 24-character hex string as a valid ObjectId', () => {
    const hexId = 'a'.repeat(24);
    expect(pipe.transform(hexId)).toBe(hexId);
  });

  it('should include the invalid value in the error message', () => {
    const badId = 'invalid-id-value';
    expect(() => pipe.transform(badId)).toThrow(
      `'${badId}' no es un ObjectId válido`,
    );
  });
});
