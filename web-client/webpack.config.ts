import { Configuration, Output, Plugin, optimize } from "webpack";
import * as path from "path";


// 環境変数 `NODE_ENV` が本番環境用であるか否か。
const inProduction: boolean = process.env.NODE_ENV === "production";


// バンドルした結果を、どこにどういう名前で出力するか
function output(): Output {
    if (inProduction) {
        return {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].bundle.min.js"
        };
    } else {
        return {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].bundle.js"
        };
    }
}


// デバッグ強化開発者用ツール
// ソースマップを出力するか否か。
function devTool(): "inline-source-map" | boolean {
    if (inProduction) {
        return false;
    } else {
        return "inline-source-map";
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
    // ※ karmaでテスト用にバンドルする際にはこのentryは無視する。
    entry: {
        app: "./src/index.ts"
    },
    output: output(),
    devtool: devTool(),
    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            {
                enforce: "pre",
                test: /\.tsx?$/,
                loader: "tslint-loader"
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                enforce: "post",
                test: /.tsx?$/,
                exclude: /(test|node_modules)/,
                loader: "istanbul-instrumenter-loader"
            }
        ]
    },
    plugins: plugins()
};


export default config;
