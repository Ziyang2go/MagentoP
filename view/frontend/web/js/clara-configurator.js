/**
 * Copyright © Exocortex, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define(
  [
    'jquery',
    'underscore',
    'mage/template',
    'mage/smart-keyboard-handler',
    'mage/translate',
    'priceUtils',
    'claraplayer',
    'catalogAddToCart',
    'jquery/ui',
    'jquery/jquery.parsequery',
    'mage/validation/validation',
  ],
  function(
    $,
    _,
    mageTemplate,
    keyboardHandler,
    $t,
    priceUtils,
    claraPlayer,
    catalogAddToCart
  ) {
    'use strict';

    window.claraplayer = claraPlayer;
    $.widget('clara.Configurator', {
      options: {
        optionConfig: null,
        submitUrl: null,
        productId: null,
        localeCode: null,
        customerName: null,
        minicartSelector: '[data-block="minicart"]',
        messagesSelector: '[data-placeholder="messages"]',
        productStatusSelector: '.stock.available',
      },

      /*
    * map clara config to magento option id
    */
      configMap: null,

      /*
    * type can be Options, Number, Boolean, Color
    */
      configType: null,

      /* for a config option in clara, if a mapping in magento config cannot be found,
    *  treat it as an additional text field when add to cart
    */
      additionalOptions: null,

      /*
    * Catalog-Add-To-Cart from Magento_Catalog/js/catalog-add-to-cart
    */
      addToCartHelper: null,

      claraConfig: null,

      currentConfig: null,

      currentConfigVolume: null,

      magentoConfig: null,

      isMapCreated: false,

      dimensions: null,

      _init: function() {},

      _create: function() {
        var self = this;
        // init react app
        const hash = window.location.hash && window.location.hash.slice(1);
        if (!hash) this._initConfigurator();
        else {
          const api = `https://mythreekit.com/api/organizations/weevers/orders/hash/${hash}`;
          fetch(api, {
            headers: new Headers({
              'Content-Type': 'application/json',
            }),
          })
            .then(res => {
              if (res.status == 200) return res.json();
              return { status: 'failed' };
            })
            .then(data => {
              if (data.status !== 'failed') {
                $('#order-configuration').html(JSON.stringify(data));
                self._initConfigurator();
              } else {
                self._initConfigurator();
              }
            });
        }
      },

      _initConfigurator: function() {
        var self = this;
        require(['weeversreact'], function() {
          $('#app-loader').hide();
          const locale = self.options.localeCode;
          if (
            locale &&
            (locale.indexOf('nl') !== -1 || locale.indexOf('de') !== -1)
          ) {
            window.setLocale(locale.slice(0, 2));
          }
          self._setupConfigurator();
        });
      },

      _setupConfigurator: function(clara) {
        var self = this;
        // clara is already loaded at this point

        // create add to cart jquery widget
        this.addToCartHelper = catalogAddToCart();
        this.additionalOptions = [];
        this.magentoConfig = this.options.optionConfig.options;
        this.claraConfig = window.weeversConfig.boxConfiguration;
        this.configMap = this._mappingConfiguration();
        this.configType = this._createConfigType();
        this.currentConfig = {
          'Box Type': this.claraConfig[0].defaultValue,
          'Box Length': this.claraConfig[1].defaultValue,
          'Box Width': this.claraConfig[2].defaultValue,
          'Box Depth': this.claraConfig[3].defaultValue,
          quantity: 1,
        };
        this._generatePostData();
        this._updatePrice();
        window.addEventListener('updateWeevers', function() {
          const boxConfig = window.weeversConfig.box;
          self.currentConfig = {
            'Box Type': boxConfig.type,
            'Box Length': boxConfig.scale.x,
            'Box Width': boxConfig.scale.z,
            'Box Depth': boxConfig.scale.y,
            quantity: window.weeversConfig.quantity,
          };
          self._updatePrice();
        });

        // setup addToCartHandle
        window.AddToCartHandle = function() {
          var jsForm = self._generatePostData();
          const uri = 'https://mythreekit.com/api/organizations/weevers/orders';
          const boxConfig = window.weeversConfig.box;
          const canvases = {};
          if (window.canvases) {
            const faces = Object.keys(window.canvases);
            faces.forEach(face => {
              if (window.canvases[face].toJSON) {
                canvases[face] = window.canvases[face].toJSON();
              }
            });
          }
          const productInfo = {
            productId: '59763504976bd8000192866b',
            sceneId: '1baf8c9e-a49a-4136-a78f-055f9430a48b',
            customer: {
              email: 'annon@example.com',
              name: self.options.customerName,
            },
            metadata: {
              box: boxConfig,
              canvases: canvases,
              canvasVersions: window.weeversConfig.canvasVersions,
            },
          };
          fetch(uri, {
            method: 'POST',
            headers: new Headers({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(productInfo),
          }).then(res =>
            res.json().then(data => {
              jsForm['clara_additional_options'] = JSON.stringify({
                mythreekitOrderId: data._id,
              });

              self._submitForm(jsForm);
            })
          );
        };
      },

      _submitForm: function(form) {
        var self = this;

        // update minicart
        $(self.options.minicartSelector).trigger('contentLoading');
        const keys = Object.keys(form);
        let queryStrings = [];
        for (let i = 0; i < keys.length; i++) {
          queryStrings[i] =
            encodeURIComponent(keys[i]) +
            '=' +
            encodeURIComponent(form[keys[i]]);
        }
        const postParams = queryStrings.join('&');

        $.ajax({
          url: self.options.submitUrl,
          data: postParams,
          type: 'post',
          contentType: 'application/x-www-form-urlencoded',

          /** @inheritdoc */
          success: function(res) {
            var eventData, parameters;

            if (res.backUrl) {
              eventData = {
                form: form,
                redirectParameters: [],
              };
              // trigger global event, so other modules will be able add parameters to redirect url
              $('body').trigger('catalogCategoryAddToCartRedirect', eventData);

              if (eventData.redirectParameters.length > 0) {
                parameters = res.backUrl.split('#');
                parameters.push(eventData.redirectParameters.join('&'));
                res.backUrl = parameters.join('#');
              }
              window.location = res.backUrl;

              return;
            }

            if (res.messages) {
              $(self.options.messagesSelector).html(res.messages);
            }

            if (res.minicart) {
              $(self.options.minicartSelector).replaceWith(res.minicart);
              $(self.options.minicartSelector).trigger('contentUpdated');
            }

            if (res.product && res.product.statusText) {
              $(self.options.productStatusSelector)
                .removeClass('available')
                .addClass('unavailable')
                .find('span')
                .html(res.product.statusText);
            }
          },
        });
      },

      _createConfigType: function() {
        var claraConfig = this.claraConfig;
        var configType = new Map();
        for (var key in claraConfig) {
          configType.set(claraConfig[key].name, claraConfig[key].type);
        }
        return configType;
      },

      // map clara configuration with magento (reverse map of this.options.optionConfig.options)
      /* this.options.optionConfig.options structure
    * options[key]:
    *               - title
    *               - selections[key]
    *                                  - name
    *  task: reverse the above key-value
    * config[title]:
    *               - key
    *               - selections[name]
    *                                  - key
    *
    * Note: title and name in config and options have to be exactly the name string
    * Name and title are unique
    * Make sure it's an one-to-one mapping, otherwise report error
    */
      _mappingConfiguration: function() {
        var claraCon = this.claraConfig;
        var magentoCon = this.magentoConfig;
        var claraKey = new Map();
        var claraSelectionKey = new Map();
        claraSelectionKey.set('keyInParent', 'values');
        claraSelectionKey.set('type', 'array');
        claraKey.set('key', 'name');
        claraKey.set('type', 'object');
        claraKey.set('nested', claraSelectionKey);

        var magentoKey = new Map();
        var magentoSelectionKey = new Map();
        magentoSelectionKey.set('keyInParent', 'selections');
        magentoSelectionKey.set('type', 'object');
        magentoSelectionKey.set('matching', 'endsWith');
        magentoSelectionKey.set('key', 'name');
        magentoKey.set('key', 'title');
        magentoKey.set('type', 'object');
        magentoKey.set('matching', 'exactly');
        magentoKey.set('nested', magentoSelectionKey);

        var map = this._reverseMapping(
          magentoCon,
          magentoKey,
          claraCon,
          claraKey,
          this.additionalOptions
        );
        if (!map) {
          console.error('Auto mapping clara configuration with magento failed');
          return null;
        }

        return map;
      },

      // recursively reverse mapping in primary using target as reference
      _reverseMapping: function(
        primary,
        primaryKey,
        target,
        targetKey,
        optionsNotFound
      ) {
        // result (using ES6 map)
        var map = new Map();
        // save the values in target that already find a matching, to ensure 1-to-1 mapping
        var valueHasMapped = new Map();

        // complexity = o(n^2), could be reduced to o(nlog(n))
        for (var pKey in primary) {
          var primaryValue =
            primaryKey.get('type') === 'object'
              ? primary[pKey][primaryKey.get('key')]
              : primary[pKey];
          if (!primaryValue) {
            console.error('Can not read primaryKey from primary');
            return null;
          }
          // search for title in claraCon
          var foundMatching = false;
          for (var tKey in target) {
            var targetValue =
              targetKey.get('type') === 'object'
                ? target[tKey][targetKey.get('key')]
                : target[tKey];
            if (!targetValue) {
              console.error('Can not read  targetKey from target');
              return null;
            }
            if (
              typeof primaryValue !== 'string' ||
              typeof targetValue !== 'string'
            ) {
              console.error(
                'Primary or target attribute value is not a string'
              );
              return null;
            }
            var matching = false;
            if (primaryKey.get('matching') === 'exactly') {
              matching = primaryValue === targetValue;
            } else if (primaryKey.get('matching') === 'endsWith') {
              matching = primaryValue.endsWith(targetValue);
            }
            if (matching) {
              if (valueHasMapped.has(targetValue)) {
                console.error(
                  'Found target attributes with same name, unable to perform auto mapping'
                );
                return null;
              }
              // find a match
              valueHasMapped.set(targetValue, true);
              var mappedValue = new Map();
              mappedValue.set('id', pKey);
              // recursively map nested object until primaryKey and targetKey have no 'nested' key
              if (primaryKey.has('nested') && targetKey.has('nested')) {
                var childMap = null;
                switch (target[tKey].type) {
                  case 'Number':
                    childMap = [primaryValue];
                    break;
                  case 'Options':
                    childMap =
                      target[tKey][targetKey.get('nested').get('keyInParent')];
                    break;
                  case 'Boolean':
                    childMap = ['true', 'false'];
                    break;
                  case 'Color':
                    break;
                }
                var nestedMap = this._reverseMapping(
                  primary[pKey][primaryKey.get('nested').get('keyInParent')],
                  primaryKey.get('nested'),
                  childMap,
                  targetKey.get('nested'),
                  null
                );
                mappedValue.set('options', nestedMap);
              } else {
                // this is a leaf node, copy price info into it
                mappedValue.set('prices', primary[pKey]['prices']);
              }
              map.set(targetValue, mappedValue);
              foundMatching = true;
              break;
            }
          }
          if (!foundMatching) {
            console.warn(
              'Can not find primary value ' + primaryValue + ' in target config'
            );
          }
        }

        // check all target to see if all target value has been mapped
        if (optionsNotFound) {
          for (var tKey in target) {
            var targetValue =
              targetKey.get('type') === 'object'
                ? target[tKey][targetKey.get('key')]
                : target[tKey];
            if (!valueHasMapped.has(targetValue)) {
              if (targetKey.has('nested')) {
                optionsNotFound.push(targetValue);
              } else {
                console.warn(
                  'Target value ' + targetValue + ' has not been mapped!'
                );
              }
            }
          }
        }
        return map;
      },

      // check if clara configuration match with magento
      _validateConfiguration(claraCon, magentoCon) {},

      _generatePostData() {
        var result = {};
        var config = this.currentConfig;
        result['product'] = this.options.productId;
        result['form_key'] = $.cookie('form_key');
        result['qty'] = this.currentConfig.quantity;
        if (!config) {
          return result;
        }

        var map = this.configMap;
        var configType = this.configType;
        var additionalOptions = this.additionalOptions;
        var dimensions = this.dimensions;
        var volume = 1;
        var additionalObj = {};
        for (var attr in config) {
          if (map.has(attr)) {
            var attrId = map.get(attr).get('id');
            switch (configType.get(attr)) {
              case 'Number':
                // update number
                var attrValue = map
                  .get(attr)
                  .get('options')
                  .get(attr)
                  .get('id');
                result['bundle_option[' + attrId + ']'] = attrValue;
                result['bundle_option_qty[' + attrId + ']'] = config[attr];
                break;
              case 'Options':
                // update options
                var configString =
                  typeof config[attr] == 'string'
                    ? config[attr]
                    : config[attr].value;
                var attrValue = map
                  .get(attr)
                  .get('options')
                  .get(configString)
                  .get('id');
                result['bundle_option[' + attrId + ']'] = attrValue;
                result['bundle_option_qty[' + attrId + ']'] = '1';
                break;
              case 'Boolean':
                // update boolean
                var attrValue = map
                  .get(attr)
                  .get('options')
                  .get(config[attr].toString())
                  .get('id');
                result['bundle_option[' + attrId + ']'] = attrValue;
                result['bundle_option_qty[' + attrId + ']'] = '1';
                break;
              case 'Color':
                // color will be treated as additional option
                break;
            }
          } else if (additionalOptions.includes(attr)) {
            var optionString = '';
            if (typeof config[attr] == 'string') {
              optionString = config[attr];
            } else if (typeof config[attr] == 'number') {
              optionString = config[attr].toString();
            } else if (typeof config[attr] == 'object') {
              for (var key in config[attr]) {
                if (config[attr].hasOwnProperty(key)) {
                  optionString =
                    optionString + key + ': ' + config[attr][key] + ' ';
                }
              }
            } else {
              console.warn("Don't know how to print " + attr);
            }
            additionalObj[attr] = optionString;
          } else {
            console.warn(attr + ' not found in config map');
          }
        }
        // update volume price
        // volume = volume / 10;
        // var materialPrice =
        //   config['Cover Material'] === 'Leather'
        //     ? 'Leather_Price'
        //     : 'Fabric_Price';
        // var volumeId = map.get('Volume_Price').get('id');
        // var volumeOptionId = map
        //   .get('Volume_Price')
        //   .get('options')
        //   .get(materialPrice)
        //   .get('id');
        // result['bundle_option[' + volumeId + ']'] = volumeOptionId;
        // result['bundle_option_qty[' + volumeId + ']'] = volume;

        // // update additional options
        // result['clara_additional_options'] = JSON.stringify(additionalObj);

        // this.currentConfigVolume = volume;
        console.log(result);
        return result;
      },

      _isNumber: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      },

      _updatePrice: function() {
        var config = this.currentConfig;
        var map = this.configMap;
        var qty = typeof config.quantity === 'number' ? config.quantity : 1;
        var result = 0;
        for (var key in config) {
          if (map.has(key)) {
            var optionMap = map.get(key).get('options');
            if (optionMap.has(config[key])) {
              result += map
                .get(key)
                .get('options')
                .get(config[key])
                .get('prices')['finalPrice']['amount'];
            } else if (optionMap.has(key)) {
              result +=
                map.get(key).get('options').get(key).get('prices')[
                  'finalPrice'
                ]['amount'] * config[key];
            }
          }
        }
        if (window.updatePrice) {
          window.updatePrice((result * qty).toFixed(2));
        }
      },
    });

    return $.clara.Configurator;
  }
);
