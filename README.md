# ClaraConfigurator

## How to use

Copy files to
```
__/magento2/app/code/Exocortex
```

## Setups in Magento

1. Volume price can easily go larger than 10000, which is the default limit of Magento. Set Stores->Configuration->Catalog->Inventory->Product Stock Options->Maximum Qty Allowed in Shopping Cart to 100000.

2. Bundle product could have a lot of options. When submit form, the default php max_input_vars is 1000. Add or replace .user.ini under __Magento/ or your php.ini with a larger value (recommend 3000).

3. Create a bundle product with a yes/no attribute "threekit", and set it to yes.

4. To make the volume price work, add an option in bundle product named "Volume_Price" and add two options "Leather_Price" and "Fabric_Price"
