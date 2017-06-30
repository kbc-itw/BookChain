import {Configuration, Entry, Output, Plugin, optimize} from "webpack";
import * as path from "path";


// 環境変数 `NODE_ENV` が本番環境用であるか否か。
const inProduction: boolean = process.env.NODE_ENV === "production";


// バンドルする対象のエントリポイント
function entry(): Entry {
    if (inProduction) {
        // 本番環境
        return {
            app: "./src/index.ts"
        };
    } else {
        // 開発環境
        // 通常のindexに加えて、テスト用コードもコンパイル・バンドル
        return {
            app: "./src/index.ts",
            test: "./test/test-index.ts"
        };
    }
}


// バンドルした結果を、どこにどういう名前で出力するか
function output(): Output {
    if (inProduction) {
        return {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].bundle.min.js'
        };
    } else {
        return {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].bundle.js'
        };
    }
}


// デバッグ強化開発者用ツール
// ソースマップを出力するか否か。
function devTool(): "source-map" | boolean {
    if (inProduction) {
        return false;
    } else {
        return "source-map";
    }
}


// webpack プラグイン
function plugins(): Plugin[] {
    if (inProduction) {
        // 本番環境用では、jsファイルの最小化を行う
        return [
            new optimize.UglifyJsPlugin()
        ];
    } else {
        // 開発環境だと（圧縮処理が重いので）なし
        return [];
    }
}


/**
 * webpack用の設定オブジェクト
 */
const config: Configuration = {
    entry: entry(),
    output: output(),
    devtool: devTool(),
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
    },
    plugins: plugins()
};


export default config;
