import { isDefined, isEmpty, requestFrame } from 'neurons-utils';
import { easingFunctions } from './easing';

export interface ITrasition {
    duration(value: number): ITrasition;
    tick(callback: (value: number) => void): ITrasition;
    from(value: number): ITrasition;
    to(value: number): ITrasition;
    easing(easing): ITrasition;
    complete(value?: number): ITrasition;
    destroy(): void;
}

type UnregisterFrameTickHandle = () => void
interface ITicker {
    onTick(callback): UnregisterFrameTickHandle;
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

export class Transition implements ITrasition {
    constructor(ticker?: ITicker){
        this._ticker = ticker || defaultTicker;
    }
    private _ticker: ITicker;

    private _from: number;
    private _to: number;
    private _rawDuration: number;
    // 实际动画执行时的总时长，这个值可能因为动画中途改变了from、to、duration和easing而临时发生变化
    private _duration: number;
    private _easing;
    private _callback: (value: number) => void;
    
    private _running: boolean = false;
    private _startTime: number;
    private _cancelLoop;

    duration(value: number) {
        if (this._rawDuration === value) return this;
        this._rawDuration = value;
        this._tryRun();
        return this;
    }
    tick(callback: (value: number) => void) {
        if (this._callback === callback) return this;
        this._callback = callback;
        this._tryRun();
        return this;
    }
    from(value: number) {
        if (this._from === value) return this;
        // 立即结束到value
        const to = this._to;
        this.complete(value);
        this._from = value;
        this._to = to;
        this._tryRun();
        return this;
    }
    to(value: number) {
        if (this._to === value) return this;
        const old = this._to;
        this._to = value;
        if (this._running) {
            // 未完成的部分切换到新的目标值，但不改变时间总长
            const t = ((new Date()).getTime() - this._startTime) / this._duration;
            const current = this._calc(this._from, old, t, this._easing);
            if (t >= 1) {
                this._setComplete(current);
                if (current !== value) {
                    this._from = current;
                    this._to = value;
                }
                this._callback(current);
            } else {
                this._from = current;
                this._startTime = (new Date()).getTime();
                this._duration = this._duration - t;
            }
        }
        this._tryRun();
        return this;
    }
    easing(easing) {
        if (this._easing === easing) return this;
        const old = this._easing;
        this._easing = easing;
        if (this._running) {
            // 未完成的部分使用新的缓动函数进行
            const t = ((new Date()).getTime() - this._startTime) / this._duration;
            const value = this._calc(this._from, this._to, t, old);
            if (t >= 1) {
                this._setComplete(value);
                this._callback(value);
            } else {
                this._from = value;
                this._startTime = (new Date()).getTime();
                this._duration = this._duration - t;
            }
        }
        this._tryRun();
        return this;
    }
    complete(value?: number) {
        if (arguments.length) {
            this._setComplete(value);
            this._callback(value);
        } else if (this._running) {
            const t = ((new Date()).getTime() - this._startTime) / this._duration;
            const current = this._calc(this._from, this._to, t, this._easing);
            this._setComplete(current);
            this._callback(current);
        }
        return this;
    }
    destroy() {
        this._cancelLoop && this._cancelLoop();
        this._cancelLoop = null;
        this._running = false;
        this._startTime = undefined;
    }
    private _assert() {
        return this._from !== undefined
            && this._to !== undefined
            && this._from !== this._to
            && this._easing !== undefined
            && this._callback !== undefined
            && this._rawDuration !== undefined;
    }
    private _tryRun() {
        if (this._running || !this._assert()) return;
        this._running = true;
        if (this._startTime === undefined) {
            this._startTime = (new Date()).getTime();
        }
        if (this._duration === undefined) {
            this._duration = this._rawDuration;
        }
        this._cancelLoop && this._cancelLoop();
        this._cancelLoop = this._ticker.onTick(this._animate);
    }
    private _onTick() {
        if (!this._running) return;
        let t = ((new Date()).getTime() - this._startTime) / this._duration;
        const value = this._calc(this._from, this._to, t, this._easing);
        if (t >= 1) {
            this._setComplete(value);
        }
        this._callback(value);
    }
    private _setComplete(value) {
        this._cancelLoop && this._cancelLoop();
        this._cancelLoop = null;
        this._running = false;
        this._startTime = undefined;
        this._duration = undefined;
        // 处理from to，便于执行值变更行为所产生的连续动画
        this._from = value;
        this._to = undefined;
    }
    private _animate = this._onTick.bind(this);
    private _calc(from, to, t, easing): number {
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

export interface IAttributesTransitionOption {
    object: any;
    duration?: number;
    easing?: (t) => number;
    ticker?: ITicker;
}

export interface IAttributesTransition {
    set(attrs: any): IAttributesTransition;
    complete(): IAttributesTransition;
    destroy(): void;
}

export class AttributesTransition implements IAttributesTransition {
    constructor(option: IAttributesTransitionOption) {
        this._option = {...(option || {})} as IAttributesTransitionOption;
        this._option.duration = isDefined(this._option.duration) ? this._option.duration : 280;
        this._option.easing = this._option.easing || easingFunctions.easeOutQuart;
        this._option.ticker = this._option.ticker || defaultTicker;
    }
    static create(option: IAttributesTransitionOption): IAttributesTransition {
        return new AttributesTransition(option);
    }
    private _option: IAttributesTransitionOption;
    private _trasitions: {[key: string]: ITrasition} = {};
    set(attrs: any): IAttributesTransition {
        if (!attrs || isEmpty(attrs)) return this;
        if (!this._option.object) return this;
        Object.keys(attrs).forEach(key => {
            if (isDefined(attrs[key])) {
                if (!this._trasitions[key]) {
                    this._trasitions[key] = new Transition(this._option.ticker);
                    this._trasitions[key].from(attrs[key]).easing(this._option.easing).duration(this._option.duration).tick((value) => {
                        this._set(key, value);
                    });
                }
                this._trasitions[key].to(attrs[key]);
            }
        })
        return this;
    }
    complete(): IAttributesTransition {
        if (!this._option.object) return this;
        Object.keys(this._trasitions).forEach(key => this._trasitions[key].complete());
        return this;
    }
    destroy() {
        Object.keys(this._trasitions).forEach(key => this._trasitions[key].destroy());
        this._trasitions = {};
        this._option.object = null;
    }
    protected _set(property: string, value: number) {
        this._option.object[property] = value;
    }
}



