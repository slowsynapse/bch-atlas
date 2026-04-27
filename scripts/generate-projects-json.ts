/**
 * Generate data/projects.json from the triage list.
 *
 * This is a one-time generation script. Run with:
 *   npx tsx scripts/generate-projects-json.ts
 *
 * Applies Joey's triage corrections:
 * - Cuts: Bitcoin ABC, Bitcoin Unlimited, bitcoin-com-wallet
 * - Dead: bitbox, bch-js, rest-bitcoin-com, SLP stuff, SmartBCH stuff, CoinFLEX stuff, cashshuffle, slp
 * - Reclassify: memo-cash/read-cash/noise-app → apps, general-protocols → ecosystem
 * - Rename: parityusd → parryonusd
 * - Collision resolution: wallets → apps, protocols → middleware/core, orgs → ecosystem, DEXes → defi
 */

interface RawProject {
  slug: string
  name: string
  continent: string
  github: string | null
  website: string | null
}

// All 190 entries from triage list, grouped by continent
const raw: RawProject[] = [
  // === CORE (16) ===
  { slug: 'bchn', name: 'Bitcoin Cash Node', continent: 'core', github: 'https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node', website: 'https://bitcoincashnode.org/' },
  { slug: 'bitcoin-abc', name: 'Bitcoin ABC', continent: 'core', github: 'https://github.com/Bitcoin-ABC/bitcoin-abc', website: 'https://www.bitcoinabc.org/' },
  { slug: 'bitcoin-unlimited', name: 'Bitcoin Unlimited', continent: 'core', github: 'https://gitlab.com/bitcoinunlimited/BCHUnlimited', website: 'https://www.bitcoinunlimited.info/' },
  { slug: 'bitcoin-verde', name: 'Bitcoin Verde', continent: 'core', github: 'https://github.com/SoftwareVerde/bitcoin-verde', website: 'https://bitcoinverde.org/' },
  { slug: 'knuth', name: 'Knuth', continent: 'core', github: 'https://github.com/k-nuth/kth', website: 'https://kth.cash/' },
  { slug: 'bchd', name: 'BCHD', continent: 'core', github: 'https://github.com/gcash/bchd', website: 'https://bchd.cash/' },
  { slug: 'flowee', name: 'Flowee the Hub', continent: 'core', github: 'https://codeberg.org/Flowee/thehub', website: 'https://flowee.org/' },
  { slug: 'smartbch', name: 'SmartBCH', continent: 'core', github: 'https://github.com/smartbch/smartbch', website: 'https://smartbch.org/' },
  { slug: 'asicseer-pool', name: 'ASICseer Pool', continent: 'core', github: 'https://github.com/cculianu/asicseer-pool', website: null },
  { slug: 'ckpool-bch', name: 'CKPool (BCH fork)', continent: 'core', github: 'https://github.com/dagurval/bchpool', website: null },
  { slug: 'bch-chips', name: 'BCH Upgrade Specifications (CHIPs)', continent: 'core', github: 'https://github.com/bitjson/bch-chips', website: 'https://upgradespecs.bitcoincashnode.org/' },
  { slug: 'cashtokens', name: 'CashTokens', continent: 'core', github: 'https://github.com/bitjson/cashtokens', website: 'https://cashtokens.org/' },
  { slug: 'bcmr', name: 'Bitcoin Cash Metadata Registries (BCMR)', continent: 'core', github: 'https://github.com/bitjson/chip-bcmr', website: 'https://cashtokens.org/docs/bcmr/chip/' },
  { slug: 'cashfusion', name: 'CashFusion', continent: 'core', github: 'https://github.com/cashshuffle/spec', website: 'https://cashfusion.org/' },
  { slug: 'cashshuffle', name: 'CashShuffle', continent: 'core', github: 'https://github.com/cashshuffle', website: 'https://cashshuffle.com/' },
  { slug: 'slp', name: 'Simple Ledger Protocol (SLP)', continent: 'core', github: 'https://github.com/simpleledger', website: 'https://slp.dev/' },

  // === MIDDLEWARE (50) ===
  { slug: 'cashscript', name: 'CashScript', continent: 'middleware', github: 'https://github.com/CashScript/cashscript', website: 'https://cashscript.org/' },
  { slug: 'libauth', name: 'Libauth', continent: 'middleware', github: 'https://github.com/bitauth/libauth', website: 'https://libauth.org/' },
  { slug: 'mainnet-js', name: 'Mainnet.js / mainnet.cash', continent: 'middleware', github: 'https://github.com/mainnet-cash/mainnet-js', website: 'https://mainnet.cash/' },
  { slug: 'bitbox', name: 'BITBOX SDK', continent: 'middleware', github: 'https://github.com/Bitcoin-com/bitbox-sdk', website: 'https://developer.bitcoin.com/bitbox/' },
  { slug: 'bch-js', name: 'bch-js', continent: 'middleware', github: 'https://github.com/Permissionless-Software-Foundation/bch-js', website: 'https://bchjs.fullstack.cash/' },
  { slug: 'bch-api', name: 'bch-api (FullStack.cash)', continent: 'middleware', github: 'https://github.com/Permissionless-Software-Foundation/bch-api', website: 'https://api.fullstack.cash/' },
  { slug: 'bitcoincashjs', name: 'BitcoinCash.js / bitcore-lib-cash', continent: 'middleware', github: 'https://github.com/bitpay/bitcore', website: null },
  { slug: 'bitcash-python', name: 'BitCash (Python)', continent: 'middleware', github: 'https://github.com/pybitcash/bitcash', website: 'https://bitcash.readthedocs.io/' },
  { slug: 'bitcoincashj', name: 'bitcoincashj', continent: 'middleware', github: 'https://github.com/pokkst/bitcoincashj', website: null },
  { slug: 'electrum-cash', name: 'electrum-cash', continent: 'middleware', github: 'https://gitlab.com/GeneralProtocols/electrum-cash', website: 'https://electrum-cash-protocol.readthedocs.io/' },
  { slug: 'fulcrum', name: 'Fulcrum', continent: 'middleware', github: 'https://github.com/cculianu/Fulcrum', website: null },
  { slug: 'rostrum', name: 'Rostrum', continent: 'middleware', github: 'https://github.com/blockparty-sh/rostrum', website: 'https://rostrum.cash/' },
  { slug: 'electrscash', name: 'ElectrsCash', continent: 'middleware', github: 'https://github.com/BitcoinUnlimited/ElectrsCash', website: null },
  { slug: 'chaingraph', name: 'Chaingraph', continent: 'middleware', github: 'https://github.com/bitauth/chaingraph', website: 'https://chaingraph.cash/' },
  { slug: 'blockbook-bch', name: 'Blockbook (BCH)', continent: 'middleware', github: 'https://github.com/trezor/blockbook', website: 'https://blockbook.pat.mn/' },
  { slug: 'watchtower-cash', name: 'WatchTower.cash', continent: 'middleware', github: 'https://github.com/paytaca/watchtower-cash', website: 'https://watchtower.cash/' },
  { slug: 'bcmr-indexer', name: 'BCMR Indexer', continent: 'middleware', github: 'https://github.com/paytaca/bcmr-indexer', website: 'https://bcmr.paytaca.com/' },
  { slug: 'riftenlabs-indexer', name: 'Riften Labs Indexer', continent: 'middleware', github: 'https://gitlab.com/riftenlabs/riftenlabs-indexer', website: 'https://docs.riftenlabs.com/' },
  { slug: 'tapswap-subsquid', name: 'TapSwap Subsquid Indexer', continent: 'middleware', github: 'https://github.com/mainnet-pat/tapswap-subsquid', website: null },
  { slug: 'slpdb', name: 'SLPDB', continent: 'middleware', github: 'https://github.com/simpleledger/SLPDB', website: 'https://slpdb.fountainhead.cash/' },
  { slug: 'slp-indexer-bcom', name: 'Bitcoin.com SLP Indexer', continent: 'middleware', github: 'https://github.com/Bitcoin-com/slp-indexer', website: 'https://developer.bitcoin.com/slp/' },
  { slug: 'bitdb', name: 'BitDB / Fountainhead', continent: 'middleware', github: 'https://github.com/fountainhead-cash', website: 'https://fountainhead.cash/' },
  { slug: 'bitsocket', name: 'BitSocket', continent: 'middleware', github: 'https://github.com/fountainhead-cash/bitsocket-debug-server', website: 'https://bitsocket.network/' },
  { slug: 'rest-bitcoin-com', name: 'rest.bitcoin.com', continent: 'middleware', github: 'https://github.com/Bitcoin-com/rest.bitcoin.com', website: 'https://rest.bitcoin.com/' },
  { slug: 'bitauth-ide', name: 'Bitauth IDE', continent: 'middleware', github: 'https://github.com/bitauth/bitauth-ide', website: 'https://ide.bitauth.com/' },
  { slug: 'meep', name: 'Meep', continent: 'middleware', github: 'https://github.com/gcash/meep', website: null },
  { slug: 'cashscript-playground', name: 'CashScript Playground', continent: 'middleware', github: 'https://github.com/CashScript/cashscript-playground', website: 'https://playground.cashscript.org/' },
  { slug: 'vm-cash', name: 'vm.cash', continent: 'middleware', github: null, website: 'https://vm.cash/' },
  { slug: 'stack-wizard', name: 'BCH Stack Wizard', continent: 'middleware', github: 'https://github.com/bitauth/bch-stack-wizard', website: null },
  { slug: 'wc2-bch-bcr', name: 'WC2-BCH-BCR (WalletConnect v2 for BCH)', continent: 'middleware', github: 'https://github.com/mainnet-pat/wc2-bch-bcr', website: null },
  { slug: 'cashconnect-js', name: 'CashConnect-JS', continent: 'middleware', github: 'https://gitlab.com/cashconnect-js/cashconnect-js', website: null },
  { slug: 'ec-walletconnect-plugin', name: 'Electron Cash WalletConnect Plugin', continent: 'middleware', github: 'https://github.com/OPReturnCode/Electron-Cash-Wallet-Connect', website: null },
  { slug: 'token-explorer-cash', name: 'Token Explorer', continent: 'middleware', github: 'https://github.com/mr-zwets/token-explorer', website: 'https://tokenexplorer.cash/' },
  { slug: 'salemkode-explorer', name: 'SalemKode Explorer', continent: 'middleware', github: 'https://github.com/salemkode/explorer', website: 'https://explorer.salemkode.com/' },
  { slug: 'opentokenregistry', name: 'OpenTokenRegistry', continent: 'middleware', github: 'https://github.com/bitjson/opentokenregistry', website: 'https://otr.cash/' },
  { slug: 'cashtokens-studio', name: 'CashTokens Studio', continent: 'middleware', github: 'https://github.com/mr-zwets/cashtokens-studio', website: 'https://cashtokens.studio/' },
  { slug: 'flipstarter', name: 'Flipstarter', continent: 'middleware', github: 'https://gitlab.com/flipstarter', website: 'https://flipstarter.cash/' },
  { slug: 'cashstarter', name: 'CashStarter', continent: 'middleware', github: 'https://github.com/SayoshiNakamario/CashStarter', website: 'https://cashstarter.cash/' },
  { slug: 'fundme-bch', name: 'FundMe (BCH)', continent: 'middleware', github: 'https://github.com/fundme-cash/fundme', website: 'https://fundme.cash/' },
  { slug: 'cashscript-workshop', name: 'CashScript Workshop', continent: 'middleware', github: 'https://github.com/paytaca/cashscript-workshop', website: null },
  { slug: 'electron-cash', name: 'Electron Cash', continent: 'middleware', github: 'https://github.com/Electron-Cash/Electron-Cash', website: 'https://electroncash.org/' },
  { slug: 'cashonize', name: 'Cashonize', continent: 'middleware', github: 'https://github.com/cashonize/cashonize-wallet', website: 'https://cashonize.com/' },
  { slug: 'paytaca', name: 'Paytaca', continent: 'middleware', github: 'https://github.com/paytaca/paytaca-app', website: 'https://www.paytaca.com/' },
  { slug: 'selene-wallet', name: 'Selene Wallet', continent: 'middleware', github: 'https://github.com/SeleneWallet/selene', website: 'https://selene.cash/' },
  { slug: 'flowee-pay', name: 'Flowee Pay', continent: 'middleware', github: 'https://codeberg.org/Flowee/pay', website: 'https://flowee.org/products/pay/' },
  { slug: 'bitcoin-com-wallet', name: 'Bitcoin.com Wallet', continent: 'middleware', github: 'https://github.com/bitcoin-com/wallet', website: 'https://wallet.bitcoin.com/' },
  { slug: 'cashaddrjs', name: 'cashaddrjs / bchaddrjs', continent: 'middleware', github: 'https://github.com/bitcoincashjs/cashaddrjs', website: null },
  { slug: 'cashaccounts', name: 'Cash Accounts', continent: 'middleware', github: 'https://github.com/Bitcoin-com/cashaccounts', website: 'https://www.cashaccount.info/' },
  { slug: 'cashid', name: 'CashID', continent: 'middleware', github: 'https://gitlab.com/cashid', website: 'https://cashid.info/' },
  { slug: 'bch-devsuite', name: 'bch-devsuite', continent: 'middleware', github: 'https://github.com/ActorForth/bch-devsuite', website: null },
  { slug: 'memo-cash', name: 'Memo.cash', continent: 'middleware', github: 'https://github.com/memocash', website: 'https://memo.cash/' },
  { slug: 'read-cash', name: 'read.cash', continent: 'middleware', github: null, website: 'https://read.cash/' },
  { slug: 'noise-app', name: 'noise.app', continent: 'middleware', github: null, website: 'https://noise.app/' },

  // === DEFI (36) ===
  { slug: 'cauldron-dex', name: 'Cauldron DEX', continent: 'defi', github: 'https://gitlab.com/riftenlabs/lib/rust-riftenlabs-defi', website: 'https://cauldron.quest/' },
  { slug: 'tapswap', name: 'TapSwap', continent: 'defi', github: 'https://github.com/mainnet-pat/tapswap-subsquid', website: 'https://tapswap.cash/' },
  { slug: 'fex-cash', name: 'Fex.cash', continent: 'defi', github: 'https://github.com/fex-cash/fex', website: 'https://fex.cash/' },
  { slug: 'jedex', name: 'Jedex', continent: 'defi', github: 'https://github.com/bitjson/jedex', website: null },
  { slug: 'anyhedge', name: 'AnyHedge', continent: 'defi', github: 'https://gitlab.com/GeneralProtocols/anyhedge', website: 'https://anyhedge.com/' },
  { slug: 'bch-bull', name: 'BCH Bull', continent: 'defi', github: 'https://gitlab.com/GeneralProtocols/bch-bull', website: 'https://bchbull.com/' },
  { slug: 'detoken', name: 'Detoken', continent: 'defi', github: 'https://gitlab.com/GeneralProtocols/anyhedge', website: 'https://defi.detoken.io/' },
  { slug: 'moria', name: 'Moria Protocol', continent: 'defi', github: 'https://gitlab.com/riftenlabs/lib/rust-riftenlabs-defi', website: 'https://docs.riftenlabs.com/moria/' },
  { slug: 'parryonusd', name: 'ParryonUSD', continent: 'defi', github: 'https://github.com/ParityUSD/contracts', website: 'https://parityusd.com/' },
  { slug: 'sushibar', name: 'SushiBar', continent: 'defi', github: 'https://github.com/mainnet-pat/SushiBar', website: null },
  { slug: 'badgercoin', name: 'BadgerCoin', continent: 'defi', github: 'https://github.com/Aenima4six2/badgers', website: 'https://badgers.cash/' },
  { slug: 'bch-pump', name: 'BCH Pump', continent: 'defi', github: 'https://github.com/bch-pump/bch-pump', website: 'https://bchpump.cash/' },
  { slug: 'bch-guru', name: 'BCH Guru', continent: 'defi', github: 'https://github.com/bchguru', website: 'https://bch.guru/' },
  { slug: 'unspent-phi', name: 'Unspent Phi', continent: 'defi', github: 'https://github.com/2qx/unspent', website: 'https://unspent.app/' },
  { slug: 'future-bitcoin-cash', name: 'Future Bitcoin Cash', continent: 'defi', github: 'https://github.com/2qx/future-bitcoin-cash', website: 'https://futurebitcoin.cash/' },
  { slug: 'opencashdao', name: 'OpenCashDAO', continent: 'defi', github: 'https://github.com/OpenCashDAO/opencashdao-contracts', website: 'https://opencashdao.org/' },
  { slug: 'oracles-cash', name: 'Oracles.cash', continent: 'defi', github: 'https://github.com/Bitcoin-com/oracles.cash', website: 'https://oracles.cash/' },
  { slug: 'general-protocols', name: 'General Protocols', continent: 'defi', github: 'https://gitlab.com/GeneralProtocols', website: 'https://generalprotocols.com/' },
  { slug: 'benswap', name: 'BenSwap', continent: 'defi', github: 'https://github.com/BenSwap', website: 'https://benswap.cash/' },
  { slug: 'mistswap', name: 'MistSwap', continent: 'defi', github: 'https://github.com/mistswapdex', website: 'https://mistswap.fi/' },
  { slug: 'muesliswap-bch', name: 'MuesliSwap (SmartBCH)', continent: 'defi', github: 'https://github.com/MuesliSwapTeam', website: 'https://muesliswap.com/' },
  { slug: 'tangoswap', name: 'TangoSwap', continent: 'defi', github: 'https://github.com/tangoswap-cash', website: 'https://tangoswap.cash/' },
  { slug: 'tropical-finance', name: 'Tropical Finance', continent: 'defi', github: 'https://github.com/tropicalfi', website: 'https://tropical.finance/' },
  { slug: 'lawnydao', name: 'LawnyDAO / LAW', continent: 'defi', github: 'https://github.com/lawnydao', website: 'https://lawnydao.org/' },
  { slug: 'marbleverse', name: 'MarbleVerse', continent: 'defi', github: null, website: 'https://marbleverse.io/' },
  { slug: 'celery', name: 'Celery', continent: 'defi', github: 'https://github.com/celerycash', website: 'https://celery.cash/' },
  { slug: 'cashcats', name: 'CashCats', continent: 'defi', github: 'https://github.com/cashcats', website: 'https://cashcats.cash/' },
  { slug: 'flexusd', name: 'flexUSD', continent: 'defi', github: 'https://github.com/coinflex-exchange/flexAssets', website: 'https://coinflex.com/flexusd/' },
  { slug: 'coinflex-bridge', name: 'CoinFLEX Bridge', continent: 'defi', github: 'https://github.com/coinflex-exchange', website: 'https://coinflex.com/' },
  { slug: 'hop-cash', name: 'Hop.cash', continent: 'defi', github: 'https://github.com/hop-cash', website: 'https://hop.cash/' },
  { slug: 'tokenbridge-cash', name: 'TokenBridge.cash', continent: 'defi', github: 'https://github.com/tokenbridge-cash', website: 'https://tokenbridge.cash/' },
  { slug: 'prompt-cash-bridge', name: 'prompt.cash bridge', continent: 'defi', github: null, website: 'https://prompt.cash/bridge' },
  { slug: 'wagon-cash', name: 'Wagon.cash', continent: 'defi', github: null, website: 'https://wagon.cash/' },
  { slug: 'sha-gate', name: 'SHA-Gate', continent: 'defi', github: 'https://github.com/smartbch/sha-gate-contract', website: 'https://smartbch.org/sha-gate/' },
  { slug: 'emerald-dao', name: 'Emerald DAO', continent: 'defi', github: null, website: 'https://emeralddao.cash/' },
  { slug: 'bitcats-heroes', name: 'BitCats Heroes', continent: 'defi', github: null, website: 'https://bitcatsheroes.com/' },
  { slug: 'p2p-exchange-paytaca', name: 'Paytaca P2P Exchange', continent: 'defi', github: 'https://github.com/paytaca/p2p-exchange-contracts', website: 'https://www.paytaca.com/applications/exchange' },
  { slug: 'stablehedge', name: 'StableHedge', continent: 'defi', github: 'https://gitlab.com/GeneralProtocols/anyhedge', website: 'https://stablehedge.cash/' },

  // === APPS (38) ===
  { slug: 'electron-cash', name: 'Electron Cash', continent: 'apps', github: 'https://github.com/Electron-Cash/Electron-Cash', website: 'https://electroncash.org' },
  { slug: 'bitcoin-com-wallet', name: 'Bitcoin.com Wallet', continent: 'apps', github: 'https://github.com/bitcoin-com', website: 'https://www.bitcoin.com/wallet/' },
  { slug: 'zapit', name: 'Zapit', continent: 'apps', github: 'https://github.com/zapit-io', website: 'https://zapit.io' },
  { slug: 'cashual-wallet', name: 'Cashual Wallet', continent: 'apps', github: null, website: 'https://cashual.cash' },
  { slug: 'selene-wallet', name: 'Selene Wallet', continent: 'apps', github: 'https://github.com/SeleneWallet', website: 'https://selene.cash' },
  { slug: 'badger-wallet', name: 'Badger Wallet', continent: 'apps', github: 'https://github.com/Bitcoin-com/badger-extension', website: 'https://badger.bitcoin.com' },
  { slug: 'paytaca', name: 'Paytaca', continent: 'apps', github: 'https://github.com/paytaca', website: 'https://paytaca.com' },
  { slug: 'cashonize', name: 'Cashonize', continent: 'apps', github: 'https://github.com/mr-zwets/cashonize-wallet', website: 'https://cashonize.com' },
  { slug: 'flowee-pay', name: 'Flowee Pay', continent: 'apps', github: 'https://gitlab.com/FloweeTheHub/floweepay', website: 'https://flowee.org' },
  { slug: 'stack-wallet', name: 'Stack Wallet', continent: 'apps', github: 'https://github.com/cypherstack/stack_wallet', website: 'https://stackwallet.com' },
  { slug: 'cake-wallet', name: 'Cake Wallet', continent: 'apps', github: 'https://github.com/cake-tech/cake_wallet', website: 'https://cakewallet.com' },
  { slug: 'coin-wallet', name: 'Coin Wallet', continent: 'apps', github: 'https://github.com/CoinSpace/CoinSpace', website: 'https://coin.space' },
  { slug: 'crescent-cash', name: 'Crescent Cash', continent: 'apps', github: null, website: 'https://crescent.cash' },
  { slug: 'ifwallet', name: 'ifwallet', continent: 'apps', github: null, website: 'https://www.ifwallet.com' },
  { slug: 'psf-wallet', name: 'PSF Wallet', continent: 'apps', github: 'https://github.com/Permissionless-Software-Foundation', website: 'https://wallet.fullstack.cash' },
  { slug: 'bitpay-wallet', name: 'BitPay Wallet', continent: 'apps', github: 'https://github.com/bitpay/wallet', website: 'https://bitpay.com/wallet' },
  { slug: 'bitpay-merchant', name: 'BitPay (Merchant)', continent: 'apps', github: 'https://github.com/bitpay', website: 'https://bitpay.com/retail' },
  { slug: 'gocrypto', name: 'GoCrypto', continent: 'apps', github: null, website: 'https://gocrypto.com' },
  { slug: 'anypay', name: 'Anypay', continent: 'apps', github: 'https://github.com/anypay', website: 'https://anypayx.com' },
  { slug: 'bch-merchant-pos', name: 'BCH Merchant PoS', continent: 'apps', github: 'https://github.com/SoftwareVerde', website: 'https://merchant.bitcoinverde.org' },
  { slug: 'marco-coino', name: 'Marco Coino / Bitcoin.com Maps', continent: 'apps', github: null, website: 'https://map.bitcoin.com' },
  { slug: 'bitcoinmap-cash', name: 'BitcoinMap.cash', continent: 'apps', github: 'https://github.com/BitcoinCashMap', website: 'https://bitcoinmap.cash' },
  { slug: 'cashrain', name: 'Cashrain', continent: 'apps', github: null, website: 'https://cashrain.com' },
  { slug: 'tapswap', name: 'TapSwap', continent: 'apps', github: 'https://github.com/mainnet-cash/tapswap', website: 'https://tapswap.cash' },
  { slug: 'cauldron-dex', name: 'Cauldron DEX', continent: 'apps', github: 'https://github.com/RiftenLabs', website: 'https://cauldron.quest' },
  { slug: 'bch-bull', name: 'BCH Bull', continent: 'apps', github: 'https://github.com/GeneralProtocols', website: 'https://bchbull.com' },
  { slug: 'anyhedge', name: 'AnyHedge', continent: 'apps', github: 'https://gitlab.com/GeneralProtocols/anyhedge', website: 'https://anyhedge.com' },
  { slug: 'detoken', name: 'Detoken', continent: 'apps', github: null, website: 'https://detoken.io' },
  { slug: 'moria', name: 'Moria', continent: 'apps', github: 'https://github.com/MoriaMoney', website: 'https://moria.money' },
  { slug: 'parityusd', name: 'ParityUSD', continent: 'apps', github: 'https://github.com/ParityUSD', website: 'https://parity.cash' },
  { slug: 'fex-cash', name: 'Fex.cash', continent: 'apps', github: null, website: 'https://fex.cash' },
  { slug: 'mistswap', name: 'MistSwap', continent: 'apps', github: 'https://github.com/mistswapdex', website: 'https://mistswap.fi' },
  { slug: 'benswap', name: 'BenSwap', continent: 'apps', github: 'https://github.com/BenSwap', website: 'https://benswap.cash' },
  { slug: 'smartbch', name: 'SmartBCH', continent: 'apps', github: 'https://github.com/smartbch', website: 'https://smartbch.org' },
  { slug: 'bch-guru', name: 'BCH Guru', continent: 'apps', github: null, website: 'https://bch.guru' },
  { slug: 'bitcats-heroes-club', name: 'BitCats Heroes Club', continent: 'apps', github: null, website: 'https://bitcats.club' },
  { slug: 'emerald-dao', name: 'Emerald DAO', continent: 'apps', github: 'https://github.com/emerald-dao', website: 'https://emerald.cash' },
  { slug: 'opencashdao', name: 'OpenCashDAO', continent: 'apps', github: 'https://github.com/OpenCashDAO', website: 'https://opencashdao.cash' },
  { slug: 'sushibar', name: 'SushiBar', continent: 'apps', github: null, website: 'https://sushibar.cash' },
  { slug: 'unspent-phi', name: 'Unspent Phi', continent: 'apps', github: 'https://github.com/2qx/unspent', website: 'https://unspent.cash' },

  // === MEDIA (19) ===
  { slug: 'memo-cash', name: 'memo.cash', continent: 'media', github: 'https://github.com/memocash/memo', website: 'https://memo.cash' },
  { slug: 'member-cash', name: 'member.cash', continent: 'media', github: 'https://github.com/memberapp', website: 'https://member.cash' },
  { slug: 'read-cash', name: 'read.cash', continent: 'media', github: null, website: 'https://read.cash' },
  { slug: 'noise-cash', name: 'noise.cash', continent: 'media', github: null, website: 'https://noise.cash' },
  { slug: 'bitcoin-cash-podcast', name: 'The Bitcoin Cash Podcast', continent: 'media', github: null, website: 'https://bitcoincashpodcast.com' },
  { slug: 'bitcoin-out-loud', name: 'Bitcoin Out Loud', continent: 'media', github: null, website: 'https://bitcoinoutloud.com' },
  { slug: 'news-bitcoin-com', name: 'Bitcoin.com News', continent: 'media', github: null, website: 'https://news.bitcoin.com' },
  { slug: 'bch-bullet', name: 'The BCH Bullet', continent: 'media', github: null, website: 'https://thebchbullet.substack.com' },
  { slug: 'bitcoin-cash-tv', name: 'Bitcoin Cash TV', continent: 'media', github: null, website: 'https://www.youtube.com/@BitcoinCashTV' },
  { slug: 'satoshis-angels', name: "Satoshi's Angels", continent: 'media', github: null, website: 'https://www.satoshisangels.com' },
  { slug: 'big-boys-big-blocks', name: 'Big Boys Big Blocks', continent: 'media', github: null, website: 'https://www.satoshisangels.com/blog' },
  { slug: 'minisatoshi-cash', name: 'Minisatoshi.cash', continent: 'media', github: 'https://github.com/minisat0shi/minisatoshi.cash', website: 'https://minisatoshi.cash' },
  { slug: 'helpme-cash', name: 'HelpMe.cash', continent: 'media', github: null, website: 'https://helpme.cash' },
  { slug: 'awesome-bitcoin-cash', name: 'Awesome Bitcoin Cash', continent: 'media', github: 'https://github.com/2qx/awesome-bitcoin-cash', website: 'https://awesomebitcoin.cash' },
  { slug: 'bitcoin-cash-site', name: 'Bitcoin Cash Site', continent: 'media', github: null, website: 'https://bitcoincashsite.com' },
  { slug: 'keep-bitcoin-free', name: 'Keep Bitcoin Free', continent: 'media', github: null, website: 'https://keepbitcoinfree.org' },
  { slug: 'bch-info', name: 'BCH.info', continent: 'media', github: 'https://github.com/bitjson/bch.info', website: 'https://bch.info' },
  { slug: 'bitcoincash-org', name: 'BitcoinCash.org', continent: 'media', github: 'https://github.com/Bitcoin-com/bitcoincash.org', website: 'https://bitcoincash.org' },
  { slug: 'bch-podcast-bitcoin-com', name: 'Bitcoin.com Podcast', continent: 'media', github: null, website: 'https://podcast.bitcoin.com' },

  // === CHARITY (5) ===
  { slug: 'eatbch', name: 'EatBCH', continent: 'charity', github: null, website: 'https://eatbch.org' },
  { slug: 'eatbch-ss', name: 'EatBCH South Sudan', continent: 'charity', github: null, website: 'https://eatbch.org/south-sudan/' },
  { slug: 'bch-please', name: 'BCH Please', continent: 'charity', github: null, website: 'https://bchplease.org' },
  { slug: 'bitcoin-cash-house', name: 'Bitcoin Cash House', continent: 'charity', github: null, website: 'https://bitcoincashhouse.com' },
  { slug: 'bch-latam', name: 'BCH Latam', continent: 'charity', github: 'https://github.com/Panmoni', website: 'https://panmoni.com' },

  // === ECOSYSTEM (26) ===
  { slug: 'bitcoin-cash-foundation', name: 'Bitcoin Cash Foundation', continent: 'ecosystem', github: 'https://github.com/bitcoincashfoundation', website: 'https://bitcoincashfoundation.org' },
  { slug: 'general-protocols', name: 'General Protocols', continent: 'ecosystem', github: 'https://gitlab.com/GeneralProtocols', website: 'https://generalprotocols.com' },
  { slug: 'bliss-conference', name: 'BCH Bliss Conference', continent: 'ecosystem', github: null, website: 'https://bliss.cash' },
  { slug: 'bch-argentina', name: 'BCH Argentina', continent: 'ecosystem', github: null, website: 'https://bcharg.com' },
  { slug: 'bch-brazil', name: 'BCH Brazil', continent: 'ecosystem', github: null, website: 'https://bchbrasil.com' },
  { slug: 'bitcoin-cash-city-townsville', name: 'Bitcoin Cash City (Townsville)', continent: 'ecosystem', github: null, website: 'https://bitcoincashcity.com' },
  { slug: 'bch-1-hackcelerator', name: 'BCH-1 Hackcelerator', continent: 'ecosystem', github: null, website: 'https://bch-1.org' },
  { slug: 'bch-blaze', name: 'BCH Blaze', continent: 'ecosystem', github: null, website: 'https://dorahacks.io/hackathon/bchblaze2025/detail' },
  { slug: 'bitcoin-cash-research', name: 'Bitcoin Cash Research', continent: 'ecosystem', github: null, website: 'https://bitcoincashresearch.org' },
  { slug: 'flipstarter', name: 'Flipstarter', continent: 'ecosystem', github: 'https://gitlab.com/flipstarter', website: 'https://flipstarter.cash' },
  { slug: 'bchn', name: 'Bitcoin Cash Node', continent: 'ecosystem', github: 'https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node', website: 'https://bitcoincashnode.org' },
  { slug: 'bchd', name: 'BCHD', continent: 'ecosystem', github: 'https://github.com/gcash/bchd', website: 'https://bchd.cash' },
  { slug: 'knuth', name: 'Knuth', continent: 'ecosystem', github: 'https://github.com/k-nuth', website: 'https://kth.cash' },
  { slug: 'bitcoin-verde', name: 'Bitcoin Verde', continent: 'ecosystem', github: 'https://github.com/SoftwareVerde/bitcoin-verde', website: 'https://bitcoinverde.org' },
  { slug: 'flowee', name: 'Flowee the Hub', continent: 'ecosystem', github: 'https://gitlab.com/FloweeTheHub', website: 'https://flowee.org' },
  { slug: 'cashscript', name: 'CashScript', continent: 'ecosystem', github: 'https://github.com/CashScript/cashscript', website: 'https://cashscript.org' },
  { slug: 'mainnet-cash', name: 'Mainnet.cash', continent: 'ecosystem', github: 'https://github.com/mainnet-cash/mainnet-js', website: 'https://mainnet.cash' },
  { slug: 'chaingraph', name: 'Chaingraph', continent: 'ecosystem', github: 'https://github.com/bitauth/chaingraph', website: 'https://chaingraph.cash' },
  { slug: 'riften-labs', name: 'Riften Labs', continent: 'ecosystem', github: 'https://github.com/RiftenLabs', website: 'https://riftenlabs.com' },
  { slug: 'bitauth-ide', name: 'Bitauth IDE', continent: 'ecosystem', github: 'https://github.com/bitauth/bitauth-ide', website: 'https://ide.bitauth.com' },
  { slug: 'cashfusion', name: 'CashFusion', continent: 'ecosystem', github: 'https://github.com/cashshuffle/cashfusion', website: 'https://cashfusion.org' },
  { slug: 'cashshuffle', name: 'CashShuffle', continent: 'ecosystem', github: 'https://github.com/cashshuffle', website: 'https://cashshuffle.com' },
  { slug: 'slp-foundation', name: 'SLP Foundation', continent: 'ecosystem', github: 'https://github.com/simpleledger', website: 'https://simpleledger.cash' },
  { slug: 'permissionless-software-foundation', name: 'Permissionless Software Foundation', continent: 'ecosystem', github: 'https://github.com/Permissionless-Software-Foundation', website: 'https://psfoundation.cash' },
  { slug: 'software-verde', name: 'Software Verde', continent: 'ecosystem', github: 'https://github.com/SoftwareVerde', website: 'https://softwareverde.com' },
  { slug: 'developers-cash', name: 'Developers.cash', continent: 'ecosystem', github: 'https://github.com/developers-cash', website: 'https://developers.cash' },
  { slug: 'bch-subreddit', name: 'r/btc', continent: 'ecosystem', github: null, website: 'https://reddit.com/r/btc' },
  { slug: 'bitcoincash-subreddit', name: 'r/Bitcoincash', continent: 'ecosystem', github: null, website: 'https://reddit.com/r/Bitcoincash' },
]

// === TRIAGE CORRECTIONS ===

// Projects to cut entirely
const CUT_SLUGS = new Set([
  'bitcoin-abc',        // Forked to XEC
  'bitcoin-unlimited',  // Dropped BCH
  'bitcoin-com-wallet', // No longer BCH-native
])

// Projects confirmed dead
const DEAD_SLUGS = new Set([
  'bitbox', 'bch-js', 'rest-bitcoin-com',    // Dead middleware
  'slpdb', 'slp-indexer-bcom', 'slp', 'slp-foundation', // SLP dead
  'smartbch',                                  // SmartBCH dead
  'flexusd', 'coinflex-bridge',                // CoinFLEX dead
  'sha-gate',                                  // SmartBCH-dependent
  'mistswap', 'benswap', 'muesliswap-bch',    // SmartBCH DEXes
  'tangoswap', 'tropical-finance',             // SmartBCH DEXes
  'cashshuffle',                                // Superseded by CashFusion
])

// Projects confirmed active
const ACTIVE_SLUGS = new Set([
  'bchn', 'bitcoin-verde', 'knuth', 'bchd', 'flowee',
  'cashtokens', 'bcmr', 'cashfusion', 'bch-chips',
  'cauldron-dex', 'tapswap', 'anyhedge', 'bch-bull', 'moria', 'parryonusd',
])

// Continent overrides (collision resolution)
const CONTINENT_OVERRIDES: Record<string, string> = {
  // Wallets/apps → apps (not middleware)
  'electron-cash': 'apps',
  'cashonize': 'apps',
  'paytaca': 'apps',
  'selene-wallet': 'apps',
  'flowee-pay': 'apps',
  // Social platforms → apps (not media)
  'memo-cash': 'apps',
  'read-cash': 'apps',
  'noise-app': 'apps',
  // DEXes/DeFi products → defi (not apps)
  'cauldron-dex': 'defi',
  'tapswap': 'defi',
  'fex-cash': 'defi',
  'anyhedge': 'defi',
  'bch-bull': 'defi',
  'detoken': 'defi',
  'moria': 'defi',
  'sushibar': 'defi',
  'bch-guru': 'defi',
  'unspent-phi': 'defi',
  'opencashdao': 'defi',
  'emerald-dao': 'defi',
  'bitcats-heroes': 'defi',
  'mistswap': 'defi',
  'benswap': 'defi',
  'smartbch': 'core',
  // Orgs → ecosystem
  'general-protocols': 'ecosystem',
  // Protocols/specs → core
  'cashfusion': 'core',
  'cashshuffle': 'core',
  // Libraries/tools → middleware
  'cashscript': 'middleware',
  'chaingraph': 'middleware',
  'bitauth-ide': 'middleware',
  'flipstarter': 'middleware',
  'mainnet-js': 'middleware',
  // Node impls stay core (not ecosystem)
  'bchn': 'core',
  'bchd': 'core',
  'knuth': 'core',
  'bitcoin-verde': 'core',
  'flowee': 'core',
}

// Slug renames
const SLUG_RENAMES: Record<string, string> = {
  'parityusd': 'parryonusd',
  'bitcats-heroes-club': 'bitcats-heroes',
  'moria-money': 'moria',
  'flowee-the-hub': 'flowee',
  'mainnet-cash': 'mainnet-js',
  'noise-cash': 'noise-app',
  'cashtokens-spec': 'cashtokens',
}

// Name overrides
const NAME_OVERRIDES: Record<string, string> = {
  'parryonusd': 'ParryonUSD',
  'noise-app': 'noise.app',
}

// Generate campaignMatchers from name + aliases
function generateMatchers(name: string, slug: string): string[] {
  const matchers = new Set<string>()
  // slug without hyphens
  matchers.add(slug.replace(/-/g, ' '))
  matchers.add(slug)
  // lowercase name
  matchers.add(name.toLowerCase())
  // common variations
  const cleanName = name.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (cleanName !== name.toLowerCase()) matchers.add(cleanName)
  return Array.from(matchers).filter(m => m.length > 2)
}

// === BUILD ===

interface ProjectOutput {
  slug: string
  name: string
  aliases: string[]
  description: string | null
  continent: string
  github: string | null
  website: string | null
  x: string | null
  telegram: string | null
  reddit: string | null
  campaignIds: string[]
  campaignMatchers: string[]
  status: string
  statusCheckedAt: string | null
  statusDetail: string | null
  lastGithubCommit: string | null
  websiteUp: boolean | null
}

const seen = new Map<string, ProjectOutput>()

for (const entry of raw) {
  // Apply slug renames
  let slug = SLUG_RENAMES[entry.slug] || entry.slug

  // Skip cut projects
  if (CUT_SLUGS.has(slug) || CUT_SLUGS.has(entry.slug)) continue

  // Apply continent override
  const continent = CONTINENT_OVERRIDES[slug] || entry.continent

  // If we've already seen this slug, merge metadata (union github/website)
  if (seen.has(slug)) {
    const existing = seen.get(slug)!
    if (!existing.github && entry.github) existing.github = entry.github
    if (!existing.website && entry.website) existing.website = entry.website
    continue
  }

  // Apply name overrides
  const name = NAME_OVERRIDES[slug] || entry.name

  // Determine status
  let status = 'unknown'
  if (DEAD_SLUGS.has(slug) || DEAD_SLUGS.has(entry.slug)) status = 'dead'
  else if (ACTIVE_SLUGS.has(slug)) status = 'active'

  const project: ProjectOutput = {
    slug,
    name,
    aliases: generateMatchers(name, slug),
    description: null,
    continent,
    github: entry.github,
    website: entry.website,
    x: null,
    telegram: null,
    reddit: null,
    campaignIds: [],
    campaignMatchers: generateMatchers(name, slug),
    status,
    statusCheckedAt: null,
    statusDetail: null,
    lastGithubCommit: null,
    websiteUp: null,
  }

  seen.set(slug, project)
}

// Write output
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const projects = Array.from(seen.values())
const outPath = resolve(__dirname, '..', 'data', 'projects.json')
writeFileSync(outPath, JSON.stringify(projects, null, 2) + '\n')

console.log(`Wrote ${projects.length} projects to ${outPath}`)
console.log(`  Active: ${projects.filter(p => p.status === 'active').length}`)
console.log(`  Dead: ${projects.filter(p => p.status === 'dead').length}`)
console.log(`  Unknown: ${projects.filter(p => p.status === 'unknown').length}`)
console.log(`  By continent:`)
const byCont: Record<string, number> = {}
projects.forEach(p => { byCont[p.continent] = (byCont[p.continent] || 0) + 1 })
Object.entries(byCont).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`    ${c}: ${n}`))
