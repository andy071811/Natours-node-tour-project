// this function returns a new anon function, which is assigned to the tour controllers, because it is async, it will return a promise
module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };  
};