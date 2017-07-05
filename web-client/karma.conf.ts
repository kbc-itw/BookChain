/**
 * @fileoverview Karma用の設定スクリプト
 */


// ここからコンパイル型情報の調整用スクリプト
import * as karma from "karma";
import * as karmaCoverage from "karma-coverage";
import * as webpack from "webpack";

// @types/karma-webpackはなかったのでここで作成
// webpack用のオプションを設定できるようにする
namespace karmaWebpack {
    export interface ConfigOptions extends karma.ConfigOptions {
        webpack: webpack.Configuration;
    }
}

// 必要なプラグイン（ここでは karma-coverage と、 karma-webpack）
// の設定情報をすべて記載できるように取り込んだインターフェース
interface ConfigThisCase extends karma.Config {
    set: (config: karmaCoverage.ConfigOptions & karmaWebpack.ConfigOptions) => void;
}
// ここまで型情報調整用スクリプト


// webpack.config.tsの設定を、entryの情報だけ削除して流用する。
// https://github.com/webpack-contrib/karma-webpack/issues/231#issuecomment-285713701
import webpackConfig from "./webpack.config";
delete webpackConfig.entry;


module.exports = (config: ConfigThisCase) => {
    config.set({

        // 相対パスを解釈する際の基準 (files, excludeなどで使われる)
        basePath: "",

        // 使用するテストフレームワーク
        frameworks: ["jasmine"],

        // ファイルのリスト　か　ブラウザに読ませるパターン
        files: [
            "test/*.ts"
        ],

        // 除外するファイル
        exclude: [],

        // ブラウザに渡す前になんかしら処理するやつら
        preprocessors: {
            "test/*.ts": ["webpack", "sourcemap"]
        },

        // テスト結果を伝える相手
        reporters: ["mocha", "coverage"],

        // カバレッジをだすレポーターの設定
        coverageReporter: {
            dir: "report",
            reporters: [
                { type: "html" },
                { type: "cobertura" }
            ]
        },

        // webpack用の設定
        webpack: webpackConfig,

        // web server port
        port: 9876,

        // レポーターとかログを色付きで表示するか
        colors: true,

        // ログレベル設定
        logLevel: config.LOG_INFO,

        // ファイルの変更を検知して勝手に動くかどうか
        autoWatch: true,

        // 起動するブラウザ
        browsers: ["PhantomJS"],

        // CIするならtrueとかなんとか
        singleRun: true,

        // ブラウザをいくつまで並行で立ち上げるか
        concurrency: Infinity
    });
};
