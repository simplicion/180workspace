const SearchService = require('../services/search.service');

exports.globalSearch = async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Query parameter q is required' });

        const results = await SearchService.globalSearch(query);
        res.json({ results });
    } catch (err) {
        next(err);
    }
};
