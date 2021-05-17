import { isDefined, isEmpty, requestFrame } from 'neurons-utils';
import { cssHextoRGBAArray, rgbToCSSRGB, rgbToHexPound, toRGBAArray, xHextoRGBAArray } from './colorutils';
import { easingFunctions } from './easing';

export interface ITrasition<T> {
    duration(value: number): ITrasition<T>;
    from(value: T): ITrasition<T>;
    to(value: T): ITrasition<T>;
    easing(easing): ITrasition<T>;
    complete(value?: T): ITrasition<T>;
    onTick(callback: (value: T) => void): ITrasition<T>;
    onComplete(callback: (value: T) => void): ITrasition<T>;
    destroy(): void;
}

type UnregisterFrameTickHandle = () => void
interface ITicker {
    onTick(callback): UnregisterFrameTickHandle;
    once(callback): UnregisterFrameTickHandle;
}
interface IRunningStates {
    startTime: number;
    duration: number;
    from: any;
    to: any;
    easing: any;
    cancelLoop: () => void;
}

const defaultTicker = {
    onTick: (callback) => {
        let canelFn;
        const fn = function () {
            callback();
            canelFn = requestFrame(fn)
        }
        canelFn = requestFrame(fn)
        return () => {
            canelFn();
        };
    },
    once: (callback) => {
        return requestFrame(callback);
    },
}

export class TransitionBase<T> implements ITrasition<T> {
    constructor(ticker?: ITicker){
        this._ticker = ticker || defaultTicker;
    }
    protected _ticker: ITicker;
    protected _from: T;
    protected _to: T;

    // 实际动画执行时的总时长，这个值可能因为动画中途改变了from、to、duration和easing而临时发生变化
    private _duration: number;
    private _easing;
    private _callback: (value: T) => void;
    private _completedCallback: (value: T) => void;
    
    private _runningStates: IRunningStates;

    duration(value: number) {
        if (this._duration === value) return this;
        this._duration = value;
        this._tryRun();
        return this;
    }
    easing(easing) {
        if (this._easing === easing) return this;
        this._easing = easing;
        this._tryRun();
        return this;
    }
    onTick(callback: (value: T) => void) {
        if (this._callback === callback) return this;
        this._callback = callback;
        this._tryRun();
        return this;
    }
    onComplete(callback: (value: T) => void) {
        if (this._completedCallback === callback) return this;
        this._completedCallback = callback;
        return this;
    }
    complete(value?: T) {
        if (arguments.length) {
            this._setComplete(value);
            this._callback(value);
            this._completedCallback && this._completedCallback(value);
        } else if (this._runningStates) {
            const t = ((new Date()).getTime() - this._runningStates.startTime) / this._runningStates.duration;
            const current = this._tween(this._runningStates.from, this._runningStates.to, t, this._runningStates.easing);
            this._setComplete(current);
            this._callback(current);
            this._completedCallback && this._completedCallback(value);
        }
        return this;
    }
    from(value: T) {
        if (this._from === value) return this;
        // 立即结束到value
        const to = this._to;
        if (this._runningStates) {
            this.complete(value);
        }
        this._from = value;
        this._to = to;
        this._tryRun();
        return this;
    }
    to(value: T) {
        if (this._to === value) return this;
        this._to = value;
        if (this._runningStates) {
            // 未完成的部分切换到新的目标值，但不改变时间总长
            const t = ((new Date()).getTime() - this._runningStates.startTime) / this._runningStates.duration;
            const current = this._tween(this._runningStates.from, this._runningStates.to, t, this._runningStates.easing);
            if (t >= 1) {
                this._setComplete(current);
                // 如果新值与当前值不同，则执行一段新动画以继续缓动到目标值
                if (!this._equals(current, value)) {
                    this._from = current;
                    this._to = value;
                }
                // 回调一次
                this._callback(current);
                this._completedCallback && this._completedCallback(value);
            } else {
                // 在剩余的时间内，缓动到新的目标点
                this._from = current;
                // 更新运行状态
                this._runningStates.startTime = (new Date()).getTime();
                this._runningStates.duration = this._runningStates.duration - t;
                this._runningStates.from = this._from;
                this._runningStates.to = this._to;
                // 回调一次
                this._callback(current);
            }
        }
        this._tryRun();
        return this;
    }
    destroy() {
        this._runningStates && this._runningStates.cancelLoop();
        this._runningStates = null;
    }
    protected _equals(newValue: T, oldValue: T): boolean {
        return newValue === oldValue;
    }
    protected _assert() {
        return this._from !== undefined
            && this._to !== undefined
            && this._easing !== undefined
            && this._callback !== undefined
            && this._duration !== undefined;
    }
    protected _tryRun() {
        if (this._runningStates || !this._assert()) return;
        const cancelLoop = this._equals(this._from , this._to)
            ? this._ticker.once(() => {
                if (!this._runningStates) return;
                const value = this._runningStates.to;
                this._setComplete(value);
                // 回调一次
                this._callback(value);
                this._completedCallback && this._completedCallback(value);
            })
            : this._ticker.onTick(
                this._animate
            );
        this._runningStates = {
            duration: this._duration,
            easing: this._easing,
            from: this._from,
            to: this._to,
            startTime: (new Date()).getTime(),
            cancelLoop: cancelLoop,
        }
    }
    protected _onTick() {
        if (!this._runningStates) return;
        let t = ((new Date()).getTime() - this._runningStates.startTime) / this._runningStates.duration;
        const value = this._tween(this._runningStates.from, this._runningStates.to, t, this._runningStates.easing);
        if (t >= 1) {
            this._setComplete(value);
            this._callback(value);
            this._completedCallback && this._completedCallback(value);
        } else {
            this._callback(value);
        }
    }
    protected _setComplete(value: T) {
        this._runningStates && this._runningStates.cancelLoop();
        this._runningStates = null;
        // 处理from to，便于执行值变更行为所产生的连续动画
        this._from = value;
        this._to = undefined;
    }
    private _animate = this._onTick.bind(this);
    protected _tween(from: T, to: T, t, easing): T {
        if (t >= 1) {
            // 完成
            return to;
        } else {
            // 子类实现计算缓动结果
            return from;
        }
    }
}

export class Transition extends TransitionBase<number> {
    static create(ticker: ITicker): Transition {
        return new Transition(ticker);
    }
    protected _tween(from: number, to: number, t, easing): number {
        if (t >= 1) {
            // 完成
            return to;
        } else {
            const v = easing(t);
            if (from > to) {
                return from - v * (from - to);
            } else {
                return from + v * (to - from);
            }
        }
    }
}

type Attributes = {[key: string]: any}

export class AttributesTransition extends TransitionBase<Attributes> {
    static create(ticker: ITicker): AttributesTransition {
        return new AttributesTransition(ticker);
    }
    from(value: Attributes) {
        // 浅复制
        return super.from(value ? {...value} : value);
    }
    to(value: Attributes) {
        // 浅复制
        return super.to(value ? {...value} : value);
    }
    protected _equals(newValue: Attributes, oldValue: Attributes): boolean {
        if (newValue === oldValue) return true;
        const newKeys = Object.keys(newValue);
        return newKeys.every(key => (newValue[key] === oldValue[key]))
    }
    protected _tween(from: Attributes, to: Attributes, t, easing): Attributes {
        if (t >= 1) {
            // 完成
            return {...to};
        } else {
            const v = easing(t);
            const ret: Attributes = {};
            let ff, tt;
            Object.keys(to).forEach(key => {
                const f = from[key], t = to[key];
                if (f !== t) {
                    if (!isDefined(f)) ret[key] = t;
                    else if (!isDefined(t)) ret[key] = f;
                    else {
                        if (this.isColorString(f)) {
                            ff = f;
                            tt = t;
                            if (this.isRgbaColor(ff)) {
                                ret[key] = this.calcRgbaColor(ff, tt, v);
                            } else {
                                ret[key] = this.calcRgbColor(ff, tt, v);
                            }
                        } else {
                            ff = f as number;
                            tt = t as number;
                            if (f > t) ret[key] = ff - v * (ff - tt);
                            else ret[key] = ff + v * (tt - ff);
                        }
                    }
                } else {
                    ret[key] = f;
                };
            })
            return ret;
        }
    }
    private calcRgbaColor(from: string, to: string, v) {
        const fromArr = toRGBAArray(from);
        const toArr = toRGBAArray(to);
        let r = fromArr[0], g = fromArr[1], b = fromArr[2], a = fromArr[3];
        // r
        if (r > toArr[0]) r = r - v * (r - toArr[0]);
        else r = r + v * (toArr[0] - r);
        // g
        if (g > toArr[1]) g = g - v * (g - toArr[1]);
        else g = g + v * (toArr[1] - g);
        // b
        if (b > toArr[2]) b = b - v * (b - toArr[2]);
        else b = b + v * (toArr[2] - b);
        // a
        if (a > toArr[3]) a = a - v * (a - toArr[3]);
        else a = a + v * (toArr[3] - a);
        return rgbToCSSRGB(r, g, b, a);
    }
    private calcRgbColor(from: string, to: string, v) {
        const fromArr = toRGBAArray(from);
        const toArr = toRGBAArray(to);
        let r = fromArr[0], g = fromArr[1], b = fromArr[2], a = fromArr[3];
        // r
        if (r > toArr[0]) r = r - v * (r - toArr[0]);
        else r = r + v * (toArr[0] - r);
        // g
        if (g > toArr[1]) g = g - v * (g - toArr[1]);
        else g = g + v * (toArr[1] - g);
        // b
        if (b > toArr[2]) b = b - v * (b - toArr[2]);
        else b = b + v * (toArr[2] - b);
        return rgbToHexPound(r, g, b);
    }
    private isColorString(value: any): boolean {
        if (!value || typeof value !== 'string') return false;
        const char = value.charAt(0);
        return char === '#' || char === 'r';
    }
    private isRgbaColor(value: string): boolean {
        return value.length >= 9;
    }
}
