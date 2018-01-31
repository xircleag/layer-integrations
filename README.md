# Layer Integrations CLI

This is a command line tool that is designed to be used with Layer [Integration Development Kit](https://preview-docs.layer.com/reference/integrations/framework) (IDK). It is used to install and deploy [Serverless](https://serverless.com/) integrations into your cloud provider environment.

## Setup

Install command line tool using npm:

    sudo npm install layer-integrations -g


## List integrations

The best way to see what integrations are available for installation is using the `--list` option.

    layer-integrations --list

This will print a list of integration names and their description.

## Install integration

In order to install an integration you need to use `install` command followed by `<integration-name>`.

    layer-integrations install email-fallback

This will download the latest version of specified integration and created a new folder with the same name as integration name.

#### Cloud Provider

By default Amazon AWS `aws` is used as a Cloud Provider but you can also specify Microsoft Azure `azure`.

    layer-integrations install email-fallback --provider aws

## Deploy integration

To deploy installed integration you need to run the following command from the integration root folder.

    layer-integrations deploy

### Monitoring

For production ready integrations we recommend enabling [PagerDuty](https://www.pagerduty.com/) by providing `--pagerduty` option.

    layer-integrations deploy --pagerduty

This will prompt you to specify additional PagerDuty credentials, API key and Integration key.

