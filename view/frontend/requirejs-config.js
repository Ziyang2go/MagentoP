var config = {
  paths: {
    claraplayer: 'https://clara.io/js/claraplayer.min',
    weeversreact: 'Exocortex_ClaraConfigurator/js/main',
  },
  shim: {
    claraplayer: {
      exports: 'claraplayer',
    },
    weeversreact: {
      exports: 'weeversreact',
    },
  },
  map: {
    '*': {
      clara_configurator: 'Exocortex_ClaraConfigurator/js/clara-configurator',
      catalogAddToCart: 'Magento_Catalog/js/catalog-add-to-cart',
    },
  },
};
