// see https://easings.net/
export const easingFunctions = {
    linear: function (t) {
        return t;
    },
    easeInSine: function (t) {
        return 1 - Math.cos(t * Math.PI / 2);
    },
    easeOutSine: function (t) {
        return Math.sin(t * Math.PI / 2);
    },
    easeInOutSine: function (t) {
        return .5 * (1 - Math.cos(Math.PI * t));
    },
    easeInQuad: function (t) {
        return t * t;
    },
    easeOutQuad: function (t) {
        return t * (2 - t);
    },
    easeInOutQuad: function (t) {
        t *= 2;
        if (t < 1) return 0.5 * t * t;
        return - 0.5 * (--t * (t - 2) - 1);
    },
    easeInCubic: function (t) {
        return t * t * t;
    },
    easeOutCubic: function (t) {
        return --t * t * t + 1;
    },
    easeInOutCubic: function (t) {
        t *= 2;
        if (t < 1) return 0.5 * t * t * t;
        return 0.5 * ((t -= 2) * t * t + 2);
    },
    easeInQuart: function (t) {
        return t * t * t * t;
    },
    easeOutQuart: function (t) {
        return 1 - (--t * t * t * t);
    },
    easeInOutQuart: function (t) {
        t *= 2;
        if (t < 1) return 0.5 * t * t * t * t;
        return -0.5 * ((t -= 2) * t * t * t - 2);
    },
    easeInQuint: function (t) {
        return t * t * t * t * t;
    },      
    easeOutQuint: function (t) {
        return --t * t * t * t * t + 1;
    },      
    easeInOutQuint: function (t) {
        t *= 2;
        if (t < 1) return 0.5 * t * t * t * t * t;
        return 0.5 * ((t -= 2) * t * t * t * t + 2);
    },
    easeInExpo: function (t) {
        return 0 == t ? 0 : Math.pow(1024, t - 1);
    },
    easeOutExpo: function (t) {
        return 1 == t ? t : 1 - Math.pow(2, -10 * t);
    },
    easeInOutExpo: function (t) {
        if (0 == t) return 0;
        if (1 == t) return 1;
        if ((t *= 2) < 1) return .5 * Math.pow(1024, t - 1);
        return .5 * (-Math.pow(2, -10 * (t - 1)) + 2);
    },
    easeInCirc: function (t) {
        return 1 - Math.sqrt(1 - t * t);
    },
    easeOutCirc: function (t) {
        return Math.sqrt(1 - (--t * t));
    },
    easeInOutCirc: function (t) {
        t *= 2
        if (t < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
        return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
    },
    easeInBack: function (t) {
        var s = 1.70158;
        return t * t * ((s + 1) * t - s);
    },
    easeOutBack: function (t) {
        var s = 1.70158;
        return --t * t * ((s + 1) * t + s) + 1;
    },
    easeInOutBack: function (t) {
        var s = 1.70158 * 1.525;
        if ((t *= 2) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
        return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
    },
    easeInBounce: function (t) {
        return 1 - easingFunctions.easeOutBounce(1 - t);
    },
    easeOutBounce: function (t) {
        if (t < (1 / 2.75)) {
            return 7.5625 * t * t;
        } else if (t < (2 / 2.75)) {
            return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
        } else if (t < (2.5 / 2.75)) {
            return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
        } else {
            return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
        }
    },
    easeInOutBounce: function (t) {
        if (t < .5) return easingFunctions.easeInBounce(t * 2) * .5;
        return easingFunctions.easeOutBounce(t * 2 - 1) * .5 + .5;
    },
    easeInElastic: function (t) {
        var s, a = 0.1, p = 0.4;
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (!a || a < 1) { a = 1; s = p / 4; }
        else s = p * Math.asin(1 / a) / (2 * Math.PI);
        return - (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
    },
    easeOutElastic: function (t) {
        var s, a = 0.1, p = 0.4;
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (!a || a < 1) { a = 1; s = p / 4; }
        else s = p * Math.asin(1 / a) / (2 * Math.PI);
        return (a * Math.pow(2, - 10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1);
    },
    easeInOutElastic: function (t) {
        var s, a = 0.1, p = 0.4;
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (!a || a < 1) { a = 1; s = p / 4; }
        else s = p * Math.asin(1 / a) / (2 * Math.PI);
        if ((t *= 2) < 1) return - 0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p) * 0.5 + 1;
    },
}