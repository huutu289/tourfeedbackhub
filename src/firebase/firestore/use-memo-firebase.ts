"use client";

import { useRef, type DependencyList } from "react";

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList
): T | MemoFirebase<T> {
  const valueRef = useRef<T | MemoFirebase<T>>();
  const depsRef = useRef<DependencyList>();

  const hasChanged =
    !depsRef.current ||
    depsRef.current.length !== deps.length ||
    deps.some((dependency, index) => !Object.is(dependency, depsRef.current![index]));

  if (hasChanged) {
    const nextValue = factory();
    if (typeof nextValue === "object" && nextValue !== null) {
      (nextValue as MemoFirebase<T>).__memo = true;
    }
    valueRef.current = nextValue;
    depsRef.current = deps;
  }

  return valueRef.current as T | MemoFirebase<T>;
}
