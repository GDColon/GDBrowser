//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
//            ******** **********   *******   **       ******** ****     **             //
//           **////// /////**///   **/////** /**      /**///// /**/**   /**             //
//          /**           /**     **     //**/**      /**      /**//**  /**             //
//          /*********    /**    /**      /**/**      /******* /** //** /**             //
//          ////////**    /**    /**      /**/**      /**////  /**  //**/**             //
//                 /**    /**    //**     ** /**      /**      /**   //****             //
//           ********     /**     //*******  /********/********/**    //***             //
//          ////////      //       ///////   //////// //////// //      ///              //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////

//Stolen from https://github.com/fakemancat/geometry-dash-api/blob/master/classes/XOR.js because I am stupid.

module.exports = class XOR {
    // Base64 functions
    b64from(text) {
        return Buffer.from(text, 'base64').toString('utf-8');
    }
    b64to(text) {
        return Buffer.from(text).toString('base64');
    }

    // Xor functions
    chr(ascii) {
        return String.fromCodePoint(ascii);
    }
    text2ascii(input) {
        return String(input).split('').map(letter => letter.charCodeAt());
    }
    cipher(data, key) {
        key = this.text2ascii(key);
        data = this.text2ascii(data);
        let keysize = key.length;
        let input_size = data.length;
        let cipher = '';

        for (let i = 0; i < input_size; i++) {
            cipher += this.chr(data[i] ^ key[i % keysize]);
        }
        return cipher;
    }
    encrypt(password, key = 37526) {
        let encode = this.cipher(password, key);
        encode = Buffer.from(encode).toString('base64');
        encode = encode
            .replace(/\//g, '_')
            .replace(/\+/g, '-');

        return encode;
    }
    decrypt(gjp, key = 37526) {
        let decode = gjp
            .replace(/_/g, '/')
            .replace(/-/g, '+');
        decode = Buffer.from(decode, 'base64').toString();
        decode = this.cipher(decode, key);

        return decode;
    }
};