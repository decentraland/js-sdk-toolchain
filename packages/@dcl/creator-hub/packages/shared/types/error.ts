export class ErrorBase<T extends string> extends Error {
  constructor(
    public name: T,
    public message: string = '',
    public cause?: any,
  ) {
    super();
  }
}
