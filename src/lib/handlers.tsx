// export function cxHandlers<T extends React.SyntheticEvent, H1 extends (event: T) => void>(
//   handler1: H1
// ): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void
// >(handler1: H1, handler2: H2): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void
// >(handler1: H1, handler2: H2, handler3: H3): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void
// >(handler1: H1, handler2: H2, handler3: H3, handler4: H4): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void
// >(handler1: H1, handler2: H2, handler3: H3, handler4: H4, handler5: H5): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void,
//   H6 extends (event: T) => void
// >(handler1: H1, handler2: H2, handler3: H3, handler4: H4, handler5: H5, handler6: H6): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void,
//   H6 extends (event: T) => void,
//   H7 extends (event: T) => void
// >(handler1: H1, handler2: H2, handler3: H3, handler4: H4, handler5: H5, handler6: H6, handler7: H7): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void,
//   H6 extends (event: T) => void,
//   H7 extends (event: T) => void,
//   H8 extends (event: T) => void
// >(
//   handler1: H1,
//   handler2: H2,
//   handler3: H3,
//   handler4: H4,
//   handler5: H5,
//   handler6: H6,
//   handler7: H7,
//   handler8: H8
// ): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void,
//   H6 extends (event: T) => void,
//   H7 extends (event: T) => void,
//   H8 extends (event: T) => void,
//   H9 extends (event: T) => void
// >(
//   handler1: H1,
//   handler2: H2,
//   handler3: H3,
//   handler4: H4,
//   handler5: H5,
//   handler6: H6,
//   handler7: H7,
//   handler8: H8,
//   handler9: H9
// ): (event: T) => void;
// export function cxHandlers<
//   T extends React.SyntheticEvent,
//   H1 extends (event: T) => void,
//   H2 extends (event: T) => void,
//   H3 extends (event: T) => void,
//   H4 extends (event: T) => void,
//   H5 extends (event: T) => void,
//   H6 extends (event: T) => void,
//   H7 extends (event: T) => void,
//   H8 extends (event: T) => void,
//   H9 extends (event: T) => void,
//   H10 extends (event: T) => void
// >(
//   handler1: H1,
//   handler2: H2,
//   handler3: H3,
//   handler4: H4,
//   handler5: H5,
//   handler6: H6,
//   handler7: H7,
//   handler8: H8,
//   handler9: H9,
//   handler10: H10
// ): (event: T) => void;
export function cxHandlers<T extends React.SyntheticEvent>(...eventHandlers: Array<(event: T) => void>) {
  return (event: T) => {
    eventHandlers.forEach((handler) => handler(event));
  };
}
