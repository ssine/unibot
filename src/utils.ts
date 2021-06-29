type Parameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

export const serialize = <T extends (...args: any[]) => any>(fn: T) => {
	let queue = Promise.resolve();
	const f = (...args: Parameters<T>) => {
		const res = queue.then(() => fn(...args));
		queue = res.catch((err) => { console.log(err) });
		return res;
	};
  return f
};