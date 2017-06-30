import {Configuration} from "webpack";
import * as path from "path";





/**
 * webpack用の設定ファイル。
 */
const config: Configuration = {

    entry: './test/test-index.ts',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: './test-bundle.js'
    },

    devtool: 'source-map',

    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            }
        ]
    }
};


export default config;
