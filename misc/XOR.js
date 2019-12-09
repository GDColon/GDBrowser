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
// edited
const map = Array.prototype.map;

module.exports = class XOR {
    // Xor functions
    text2ascii(input) {
        return String(input).split('').map(letter => letter.charCodeAt());
    }

    cipher(data, key) {
        key = this.text2ascii(key);
        data = this.text2ascii(data);
        let cipher = '';

        for (let i = 0; i < data.length; i++) {
            cipher += String.fromCodePoint(data[i] ^ key[i % key.length]);
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