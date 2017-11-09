<?php
/**
 * Copyright © Exocortex, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Exocortex\ClaraConfigurator\Observer;

use Magento\Framework\Event\Observer as EventObserver;
use Magento\Framework\Event\ObserverInterface;
use Psr\Log\LoggerInterface as LoggerInterface;

class SalesModelServiceQuoteSubmitBeforeObserver implements ObserverInterface
{
    private $quoteItems = [];

    private $quote = null;
    private $order = null;

    private $_logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->_logger = $logger;
    }

    /**
     * copy comments from quote to sale
     *
     * @param \Magento\Framework\Event\Observer $observer
     * @return void
     */
    public function execute(\Magento\Framework\Event\Observer $observer)
    {
        $this->quote = $observer->getQuote();
        $this->order = $observer->getOrder();


        /* @var  \Magento\Sales\Model\Order\Item $orderItem */
        foreach($this->order->getItems() as $orderItem){
            if(!$orderItem->getParentItemId() && $orderItem->getProductType() == \Magento\Catalog\Model\Product\Type::TYPE_BUNDLE){
                if($quoteItem = $this->getQuoteItemById($orderItem->getQuoteItemId())){
                    if ($additionalOptionsQuote = $quoteItem->getOptionByCode('additional_options')) {
                        if($additionalOptionsOrder = $orderItem->getProductOptionByCode('additional_options')){
                            if(is_array($additionalOptionsQuote)) {
                                $additionalOptions = array_merge($additionalOptionsQuote, $additionalOptionsOrder);
                            }
                            else{
                            }
                        }
                        else{
                            $additionalOptions = $additionalOptionsQuote;
                        }
                        if(count($additionalOptions) > 0){
                            $options = $orderItem->getProductOptions();
                            $options['additional_options'] = unserialize($additionalOptions->getValue());
                            $orderItem->setProductOptions($options);
                        }

                    }
                }
            }
        }
    }

    private function getQuoteItemById($id){
        if(empty($this->quoteItems)){
            /* @var  \Magento\Quote\Model\Quote\Item $item */
            foreach($this->quote->getItems() as $item){

                if(!$item->getParentItemId() && $item->getProductType() == \Magento\Catalog\Model\Product\Type::TYPE_BUNDLE){
                    $this->quoteItems[$item->getId()] = $item;
                }
            }
        }


        if(array_key_exists($id, $this->quoteItems)){
            return $this->quoteItems[$id];
        }

        return null;
    }
}
