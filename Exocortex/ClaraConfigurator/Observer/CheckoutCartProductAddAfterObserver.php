<?php
/**
 * Copyright © Exocortex, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Exocortex\ClaraConfigurator\Observer;

use Magento\Framework\Event\Observer as EventObserver;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\App\RequestInterface;
use Psr\Log\LoggerInterface as LoggerInterface;

class CheckoutCartProductAddAfterObserver implements ObserverInterface
{
    protected $_request;
    private $_logger;

    /**
     * @param RequestInterface $request
     */
    public function __construct(RequestInterface $request,
                                LoggerInterface $logger)
    {
        $this->_request = $request;
        $this->_logger = $logger;
    }

    /**
     * add additional comment to cart
     *
     * @param \Magento\Framework\Event\Observer $observer
     * @return void
     */
    public function execute(\Magento\Framework\Event\Observer $observer)
    {
        /* @var \Magento\Quote\Model\Quote\Item $item */
        $item = $observer->getQuoteItem();

        $additionalOptions = array();

        if ($additionalOption = $item->getOptionByCode('additional_options')){
            $additionalOptions = (array) unserialize($additionalOption->getValue());
        }

        $post = $this->_request->getParam('clara_additional_options');
        $decodePost = json_decode($post, true);

        if(is_array($decodePost)){
            foreach($decodePost as $key => $value){
                if($key == '' || $value == ''){
                    continue;
                }

                $additionalOptions[] = [
                    'label' => $key,
                    'value' => $value
                ];
            }
        }
        else {
            $additionalOptions[] = [
                    'label' => 'Option(s)',
                    'value' => $decodePost
                ];
        }

        if(count($additionalOptions) > 0){
            $item->addOption(array(
                'product_id' => $item->getProductId(),
                'code' => 'additional_options',
                'value' => serialize($additionalOptions)
            ));
        }
    }
}
