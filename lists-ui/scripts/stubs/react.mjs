export const useMemo = (f) => f();
export const useState = (v) => [v, () => {}];
export const useEffect = () => {};
export const useRef = (v) => ({current: v});
export const useCallback = (f) => f;
