# Advanced Therapist Knowledge Platform

セラピストの働き方と専門知識を統合した知識プラットフォーム

🔗 **Live Demo**: https://yuto-tashiro.github.io/advancedtherapist

## 概要

42エピソードの音声配信コンテンツを統合し、セラピストが実務で参照できる検索可能なWebツールです。

### 主な機能

- 🔍 **高度な検索**: キーワード、テーマでの絞り込み
- 🏷️ **テーマ別分類**: 27の自動抽出されたテーマ
- 🕸️ **知識グラフ**: エピソード間の関連性を可視化
- ⭐ **ブックマーク**: 重要なエピソードを保存・エクスポート
- 📱 **レスポンシブ**: モバイル・タブレット・デスクトップ対応

## クイックスタート

### オンラインで使用

https://yuto-tashiro.github.io/advancedtherapist にアクセス

### ローカルで実行

```bash
# リポジトリをクローン
git clone https://github.com/yuto-tashiro/advancedtherapist.git
cd advancedtherapist

# ローカルサーバーを起動
python3 -m http.server 8000

# ブラウザで開く
open http://localhost:8000
```

## 技術スタック

- **フロントエンド**: HTML5, Vanilla JavaScript, CSS3
- **検索**: Fuse.js (ファジー検索)
- **可視化**: Vis.js (知識グラフ)
- **データ処理**: Node.js

## プロジェクト構成

```
├── index.html              # メインHTML
├── styles.css              # デザインシステム
├── app.js                  # アプリケーションロジック
├── data-processor.js       # データ処理スクリプト
├── data/
│   ├── episodes-index.json # エピソードデータ
│   └── themes.json         # テーマ一覧
└── README.md
```

## データ更新

新しいエピソードを追加した場合:

```bash
node data-processor.js
```

## 使い方

### 1. エピソードを検索する

- **キーワード検索**: 検索バーにキーワードを入力して関連エピソードを検索
- **テーマフィルター**: サイドバーからテーマを選択して絞り込み
- **複数条件**: キーワードとテーマを組み合わせた高度な検索が可能

### 2. 知識グラフを活用する

- エピソード間の関連性を視覚的に把握
- ノードをクリックして関連エピソードを探索
- テーマごとの知識のつながりを発見

### 3. ブックマーク機能

- 重要なエピソードをブックマークして保存
- ブックマークリストをJSON形式でエクスポート
- 後から簡単にアクセス可能

## 特徴的な機能

### ファジー検索

Fuse.jsを使用した柔軟な検索により、完全一致でなくても関連するエピソードを発見できます。

### テーマ自動抽出

27の専門テーマが自動的に分類され、セラピストの関心領域に応じた学習が可能です。

### レスポンシブデザイン

モバイル、タブレット、デスクトップのあらゆるデバイスで快適に利用できます。

## ライセンス

© 2026 Advanced Therapist. All rights reserved.

## 開発者

田代 雄斗 (Yuto Tashiro)
安藤 祐介 (Yusuke Ando)
テスト文章。テスト文章。テスト文章。テスト文章。テスト文章。