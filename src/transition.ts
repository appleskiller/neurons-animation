import { isDefined, isEmpty, requestFrame } from 'neurons-utils';
import { easingFunctions } from './easing';

export interface ITrasition<T> {
    duration(value: number): ITrasition<T>;
    tick(callback: (value: T) => void): ITrasition<T>;
    from(value: T): ITrasition<T>;
    to(value: T): ITrasition<T>;
    easing(easing): ITrasition<T>;
    complete(value?: T): ITrasition<T>;
    destroy(): void;
}

type UnregisterFrameTickHandle = () => void
interface ITicker {
    onTick(callback): UnregisterFrameTickHandle;
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
    
    private _runningStates: IRunningStates;
    private _cancelLoop;

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
    tick(callback: (value: T) => void) {
        if (this._callback === callback) return this;
        this._callback = callback;
        this._tryRun();
        return this;
    }
    complete(value?: T) {
        if (arguments.length) {
            this._setComplete(value);
            this._callback(value);
        } else if (this._runningStates) {
            const t = ((new Date()).getTime() - this._runningStates.startTime) / this._runningStates.duration;
            const current = this._tween(this._runningStates.from, this._runningStates.to, t, this._runningStates.easing);
            this._setComplete(current);
            this._callback(current);
        }
        return this;
    }
    from(value: T) {
        if (this._from === value) return this;
        // 立即结束到value
        const to = this._to;
        this.complete(value);
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
            } else {
                // 在剩余的时间内，缓动到新的目标点
                this._from = current;
                // 更新运行状态
                this._runningStates.startTime = (new Date()).getTime();
                this._runningStates.duration = this._runningStates.duration - t;
                this._runningStates.from = this._from;
                this._runningStates.to = this._to;
            }
            // 回调一次
            this._callback(current);
        }
        this._tryRun();
        return this;
    }
    destroy() {
        this._cancelLoop && this._cancelLoop();
        this._cancelLoop = null;
        this._runningStates && this._runningStates.cancelLoop();
        this._runningStates = null;
    }
    protected _equals(newValue: T, oldValue: T): boolean {
        return newValue === oldValue;
    }
    protected _assert() {
        return this._from !== undefined
            && this._to !== undefined
            && !this._equals(this._from , this._to)
            && this._easing !== undefined
            && this._callback !== undefined
            && this._duration !== undefined;
    }
    protected _tryRun() {
        if (this._runningStates || !this._assert()) return;
        this._runningStates = {
            duration: this._duration,
            easing: this._easing,
            from: this._from,
            to: this._to,
            startTime: (new Date()).getTime(),
            cancelLoop: this._ticker.onTick(this._animate),
        }
    }
    protected _onTick() {
        if (!this._runningStates) return;
        let t = ((new Date()).getTime() - this._runningStates.startTime) / this._runningStates.duration;
        const value = this._tween(this._runningStates.from, this._runningStates.to, t, this._runningStates.easing);
        if (t >= 1) {
            this._setComplete(value);
        }
        this._callback(value);
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
    constructor(ticker?: ITicker){
        super(ticker);
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

type Attributes = {[key: string]: number}

export class AttributesTransition extends TransitionBase<Attributes> {
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
            Object.keys(to).forEach(key => {
                const f = from[key], t = to[key];
                if (f === t) return;
                if (f > t) {
                    ret[key] = f - v * (f - t);
                } else {
                    ret[key] = f + v * (t - f);
                }
            })
            return ret;
        }
    }
}



