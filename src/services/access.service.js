'use strict';

const shopModel = require("../models/shop.model");
const bcrypt = require('bcrypt')
const crypto = require('crypto');
const KeyTokenService = require("./key.service");
const { createTokenPair } = require("../auth/authUtils");
const { getData } = require("../utils");
const { BadRequestErrorResponse, AuthenticationErrorResponse } = require("../core/error.response");
const { findByEmail } = require("./shop.service");
const RoleShop = {
    SHOP: 'shop',
    WRITER: 'writer',
    EDITOR: 'editor',
    BUYER: 'buyer',
    ADMIN: 'admin',
}
class accessService {
   /*
    1. check email in database
    2. match password
    3. create access token and refresh token and save 
    4. generate tokens
    5. get date and return login
   */
    static login = async({email, password, refreshToken = null}) => {
        // 1.
        const foundShop = await findByEmail({email})
        if(!foundShop) throw new BadRequestErrorResponse('Shop not found')
        // 2.
        const matchShop = bcrypt.compare(password, foundShop.email)
        if(!matchShop) throw new AuthenticationErrorResponse('Authentication error')
        // 3.
        const privateKey = crypto.randomBytes(64).toString('hex')
        const publicKey = crypto.randomBytes(64).toString('hex')
        // 4.
        const {_id: userId} = foundShop
        const tokens = await createTokenPair({userId, email}, publicKey, privateKey)
        await KeyTokenService.createKeyToken({publicKey, privateKey, refreshToken: tokens.refreshToken, userId})
        return {
            metadata: {
                shop: getData({fields: ['_id', 'name', 'email'], object: foundShop}),
                tokens
            }
        }
    }
    static singUp = async ({name, email, password}) => {
            const holderEmail = await shopModel.findOne({email}).lean()
            if(holderEmail) {
                throw new BadRequestErrorResponse('Error: Shop already registered')
            }

            const passwordHash = await bcrypt.hash(password, 10)
            const newShop = await shopModel.create({
                name, email, password: passwordHash, roles: [RoleShop.SHOP]
            })
            if(newShop) {
                // created private key and public key
                const privateKey = crypto.randomBytes(64).toString('hex')
                const publicKey = crypto.randomBytes(64).toString('hex')

                const keyTokenShop = await KeyTokenService.createKeyToken({
                    userId: newShop._id,
                    publicKey,
                    privateKey
                })
              

                if(!keyTokenShop) {
                   throw new BadRequestErrorResponse('Error: public key not available')
                }
                const tokens = await createTokenPair({userId: newShop._id, email}, publicKey, privateKey)
                return {
                    code: 201,
                    metadata: {
                        shop: getData({fields: ['_id', 'name', 'email'], object: newShop}),
                        tokens
                    }
                }
                
            }
            return{
                code: 201,
                metadata: null
            }
    }
}

module.exports = accessService