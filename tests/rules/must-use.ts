import { TSESLint } from '@typescript-eslint/experimental-utils';
import rule from '../../src/rules/must-use-result';
import { MessageIds } from '../../src/utils';

function injectResult(name: string, text: string) {
  return (
    `// ${name}
declare interface ErrorConfig {
  withStackTrace: boolean;
}
declare type InferOkTypes<R> = R extends Result<infer T, unknown> ? T : never;
declare type InferErrTypes<R> = R extends Result<unknown, infer E> ? E : never;
declare type Result<T, E> = Ok<T, E> | Err<T, E>;
interface IResult<T, E> {
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  map<A>(f: (t: T) => A): Result<A, E>;
  mapErr<U>(f: (e: E) => U): Result<T, U>;
  andThen<R extends Result<unknown, unknown>>(f: (t: T) => R): Result<InferOkTypes<R>, InferErrTypes<R> | E>;
  andThen<U, F>(f: (t: T) => Result<U, F>): Result<U, E | F>;
  orElse<R extends Result<unknown, unknown>>(f: (e: E) => R): Result<T, InferErrTypes<R>>;
  orElse<A>(f: (e: E) => Result<T, A>): Result<T, A>;
  asyncAndThen<U, F>(f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
  asyncMap<U>(f: (t: T) => Promise<U>): ResultAsync<U, E>;
  unwrapOr<A>(v: A): T | A;
  match<A>(ok: (t: T) => A, err: (e: E) => A): A;
  _unsafeUnwrap(config?: ErrorConfig): T;
  _unsafeUnwrapErr(config?: ErrorConfig): E;
}

declare class Ok<T, E> implements IResult<T, E> {
  readonly value: T;
  constructor(value: T);
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  map<A>(f: (t: T) => A): Result<A, E>;
  mapErr<U>(_f: (e: E) => U): Result<T, U>;
  andThen<R extends Result<unknown, unknown>>(f: (t: T) => R): Result<InferOkTypes<R>, InferErrTypes<R> | E>;
  andThen<U, F>(f: (t: T) => Result<U, F>): Result<U, E | F>;
  orElse<R extends Result<unknown, unknown>>(_f: (e: E) => R): Result<T, InferErrTypes<R>>;
  orElse<A>(_f: (e: E) => Result<T, A>): Result<T, A>;
  asyncAndThen<U, F>(f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
  asyncMap<U>(f: (t: T) => Promise<U>): ResultAsync<U, E>;
  unwrapOr<A>(_v: A): T | A;
  match<A>(ok: (t: T) => A, _err: (e: E) => A): A;
  _unsafeUnwrap(_?: ErrorConfig): T;
  _unsafeUnwrapErr(config?: ErrorConfig): E;
}

declare class Err<T, E> implements IResult<T, E> {
  readonly error: E;
  constructor(error: E);
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  map<A>(_f: (t: T) => A): Result<A, E>;
  mapErr<U>(f: (e: E) => U): Result<T, U>;
  andThen<R extends Result<unknown, unknown>>(_f: (t: T) => R): Result<InferOkTypes<R>, InferErrTypes<R> | E>;
  andThen<U, F>(_f: (t: T) => Result<U, F>): Result<U, E | F>;
  orElse<R extends Result<unknown, unknown>>(f: (e: E) => R): Result<T, InferErrTypes<R>>;
  orElse<A>(f: (e: E) => Result<T, A>): Result<T, A>;
  asyncAndThen<U, F>(_f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
  asyncMap<U>(_f: (t: T) => Promise<U>): ResultAsync<U, E>;
  unwrapOr<A>(v: A): T | A;
  match<A>(_ok: (t: T) => A, err: (e: E) => A): A;
  _unsafeUnwrap(config?: ErrorConfig): T;
  _unsafeUnwrapErr(_?: ErrorConfig): E;
}

declare function getResult(): Result<string, Error>
declare function getNormal(): number
const obj: { get: () => Result<string, Error> }

` + text
  );
}

new TSESLint.RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
}).run('must-use-result', rule, {
  valid: [
    injectResult(
      'call unwrapOr',
      `
      const result = getResult()

      result.unwrapOr()
    `
    ),
    injectResult(
      'call unwrapOr after some methods',
      `
      const result = getResult()

      result.map(() => {}).unwrapOr('')
    `
    ),
    injectResult(
      'Call match',
      `
      const result = getResult()
      result.match(() => {}, () => {})
    `
    ),
    injectResult(
      'Return result from function',
      `
      function main() {
        return getResult().map(() => {})
      }
    `
    ),
    injectResult(
      'Return result from an arrow function',
      `
      const main = () => getResult().map(() => {})
    `
    ),
    injectResult(
      'Call a normal function',
      `
      getNormal()
    `
    ),
    `// Without definitions
      getNormal()
    `,
    injectResult(
      'Await Promise handled properly',
      `
      (await getRes()).unwrapOr(5);              // case1
      const res1 = (await getRes()).unwrapOr(5); // case2
      const res2 = await getRes();               // case3
      res2.unwrapOr(5);
      `
    ),
  ],
  invalid: [
    {
      code: injectResult(
        'only assignment',
        `
        const result = getResult()
      `
      ),
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      code: injectResult(
        'Call map for result',
        `
        const result = getResult();
        result.map(() => {})
      `
      ),
      errors: [
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
      ],
    },
    {
      code: injectResult(
        'only call',
        `
        getResult()
      `
      ),
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      code: injectResult(
        'call external function',
        `
        const v = getResult()
        externaFunction(v)
      `
      ),
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      code: injectResult(
        'made call from object',
        `
        obj.get()
      `
      ),
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      code: injectResult(
        'none of the handle methods is called',
        `
        getResult().unwrapOr
      `
      ),
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      code: injectResult(
        'called inside a function',
        `
        function main() {
          getResult().map(() => {})
        }
      `
      ),
      errors: [
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
      ],
    },
    {
      code: injectResult(
        'Await Promise is not handled properly',
        `
        const res = await getRes(); // case1
        const res1 = await getRes(); // case2
        res1.unwrapOr;
        
        await getRes(); // case3
        `
      ),
      errors: [
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
      ],
    },
  ],
});
