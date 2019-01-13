module.exports = class Utils {
    constructor(app) {
        this.app = app;
    }

    findMatchesInArray(array, what) {
        return array.filter(x => x.search(what) >= 0);
    }
}
