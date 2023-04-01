'use strict';

const accessService = require("../services/access.service");

class AccessController {

    signUp = async(req, res, next) => {
        try {
            console.log('P:::signUp', req.body)
            return res.status(201).json(await accessService.singUp(req.body))
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccessController();