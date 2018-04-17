const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    entry: [
        "babel-polyfill",
        "./js/app.js",
        "./styles/base.css",
        "./styles/miner_info.css",
        "./styles/wallets_info.css",
        "./styles/wallets_stats.css",
        "./styles/workers_stats.css",
        "./styles/table.css",
        "./styles/miners.css"
    ],
    output: {
        filename: "static/bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                use: [
                    'url-loader',
                    'img-loader'
                ]
            },
            {
                test: /.jsx?$/,
                loader: "babel-loader",
                query: {
                    plugins: [],
                    presets: ["env", "stage-0", "react"]
                }
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin("static/bundle.css", {
            allChunks: true
        })
    ]
};
