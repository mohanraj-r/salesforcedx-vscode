/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { fail } from 'assert';
import { expect } from 'chai';
import { stub } from 'sinon';
import { nls } from '../../../src/messages';
import {
  BrowserNode,
  ComponentUtils,
  MetadataOutlineProvider,
  NodeType,
  parseErrors,
  TypeUtils
} from '../../../src/orgBrowser';

/* tslint:disable:no-unused-expression */
describe('load org browser tree outline', () => {
  const username = 'test-username@test1234.com';
  let metadataProvider: MetadataOutlineProvider;

  beforeEach(() => {
    metadataProvider = new MetadataOutlineProvider(username);
  });

  it('should load the root node with default org', async () => {
    const expectedNode = new BrowserNode(username, NodeType.Org);
    const orgNode = await metadataProvider.getChildren();
    expect(orgNode).to.deep.equal([expectedNode]);
  });

  it('should display emptyNode with error message if default org is not set', async () => {
    metadataProvider = new MetadataOutlineProvider(undefined);
    const expectedNode = new BrowserNode(
      nls.localize('missing_default_org'),
      NodeType.EmptyNode
    );
    const orgNode = await metadataProvider.getChildren();
    expect(orgNode).to.deep.equal([expectedNode]);
  });

  it('should load metadata type nodes when tree is created', async () => {
    const metadataInfo = [
      {
        label: 'typeNode1',
        type: NodeType.MetadataType,
        xmlName: 'typeNode1'
      },
      {
        label: 'typeNode2',
        type: NodeType.MetadataType,
        xmlName: 'typeNode2'
      }
    ];
    const expected = [
      {
        label: 'typeNode1',
        type: NodeType.MetadataType,
        fullName: 'typeNode1'
      },
      {
        label: 'typeNode2',
        type: NodeType.MetadataType,
        fullName: 'typeNode2'
      }
    ];
    const orgNode = new BrowserNode(username, NodeType.Org);
    const getTypesStub = stub(
      MetadataOutlineProvider.prototype,
      'getTypes'
    ).returns(metadataInfo);
    const typesNodes = await metadataProvider.getChildren(orgNode);
    compareNodes(typesNodes, expected);
    getTypesStub.restore();
  });

  it('should throw error if trouble fetching types', async () => {
    const orgNode = new BrowserNode(username, NodeType.Org);
    const loadTypesStub = stub(TypeUtils.prototype, 'loadTypes').returns(
      Promise.reject(
        JSON.stringify({
          name: 'Should throw an error'
        })
      )
    );
    try {
      await metadataProvider.getChildren(orgNode);
      fail('Should have thrown an error getting the children');
    } catch (e) {
      expect(e.message).to.equal(
        `${nls.localize('error_fetching_metadata')} ${nls.localize(
          'error_org_browser_text'
        )}`
      );
    }
    loadTypesStub.restore();
  });

  it('should throw error if trouble fetching components', async () => {
    const metadataObject = {
      xmlName: 'typeNode1',
      directoryName: 'testDirectory',
      suffix: 'cls',
      inFolder: false,
      metaFile: false,
      label: 'Type Node 1'
    };
    const typeNode = new BrowserNode(
      'ApexClass',
      NodeType.MetadataType,
      undefined,
      metadataObject
    );
    const loadCmpsStub = stub(
      ComponentUtils.prototype,
      'loadComponents'
    ).returns(
      Promise.reject(
        JSON.stringify({
          name: 'Should throw an error'
        })
      )
    );

    try {
      await metadataProvider.getChildren(typeNode);
      fail('Should have thrown an error getting the children');
    } catch (e) {
      expect(e.message).to.equal(
        `${nls.localize('error_fetching_metadata')} ${nls.localize(
          'error_org_browser_text'
        )}`
      );
    }
    loadCmpsStub.restore();
  });

  it('should load metadata component nodes when a type node is selected', async () => {
    const expected = [
      {
        label: 'cmpNode1',
        fullName: 'cmpNode1',
        type: NodeType.MetadataComponent
      },
      {
        label: 'cmpNode2',
        fullName: 'cmpNode2',
        type: NodeType.MetadataComponent
      }
    ];
    const getCmpsStub = stub(
      MetadataOutlineProvider.prototype,
      'getComponents'
    ).returns(expected.map(n => n.fullName));

    const metadataObject = {
      xmlName: 'typeNode1',
      directoryName: 'testDirectory',
      suffix: 'cls',
      inFolder: false,
      metaFile: false,
      label: 'Type Node 1'
    };
    const typeNode = new BrowserNode(
      'ApexClass',
      NodeType.MetadataType,
      undefined,
      metadataObject
    );
    const cmpsNodes = await metadataProvider.getChildren(typeNode);
    compareNodes(cmpsNodes, expected);

    getCmpsStub.restore();
  });

  it('should display emptyNode with error message if no components are present for a given type', async () => {
    const metadataObject = {
      xmlName: 'typeNode1',
      directoryName: 'classes',
      suffix: 'cls',
      inFolder: false,
      metaFile: false,
      label: 'Type Node 1'
    };
    const typeNode = new BrowserNode(
      'ApexClass',
      NodeType.MetadataType,
      undefined,
      metadataObject
    );

    const emptyNode = new BrowserNode(
      nls.localize('empty_components'),
      NodeType.EmptyNode
    );
    const loadCmpsStub = stub(
      ComponentUtils.prototype,
      'loadComponents'
    ).returns([]);
    const cmpsNodes = await metadataProvider.getChildren(typeNode);
    expect(cmpsNodes).to.deep.equal([emptyNode]);
    loadCmpsStub.restore();
  });

  it('should display folders and components that live in them when a folder type node is selected', async () => {
    const folder1 = [
      {
        fullName: 'SampleFolder/Sample_Template',
        label: 'Sample_Template',
        type: NodeType.MetadataField
      },
      {
        fullName: 'SampleFolder/Sample_Template2',
        label: 'Sample_Template2',
        type: NodeType.MetadataField
      }
    ];
    const folder2 = [
      {
        fullName: 'SampleFolder2/Main',
        label: 'Main',
        type: NodeType.MetadataField
      }
    ];
    const folders = [
      {
        fullName: 'SampleFolder',
        label: 'SampleFolder',
        type: NodeType.Folder
      },
      {
        fullName: 'SampleFolder2',
        label: 'SampleFolder2',
        type: NodeType.Folder
      }
    ];

    const loadCmpStub = stub(ComponentUtils.prototype, 'loadComponents');
    loadCmpStub
      .withArgs(username, 'EmailFolder')
      .returns(folders.map(n => n.fullName));
    loadCmpStub
      .withArgs(username, 'EmailTemplate', folders[0].fullName)
      .returns(folder1.map(n => n.fullName));
    loadCmpStub
      .withArgs(username, 'EmailTemplate', folders[1].fullName)
      .returns(folder2.map(n => n.fullName));

    const metadataObject = {
      xmlName: 'typeNode1',
      directoryName: 'testDirectory',
      suffix: 'cls',
      inFolder: true,
      metaFile: false,
      label: 'Type Node 1'
    };

    const testNode = new BrowserNode(
      'EmailTemplate',
      NodeType.MetadataType,
      undefined,
      metadataObject
    );

    const f = await metadataProvider.getChildren(testNode);
    compareNodes(f, folders);

    const f1 = await metadataProvider.getChildren(f[0]);
    compareNodes(f1, folder1);

    const f2 = await metadataProvider.getChildren(f[1]);
    compareNodes(f2, folder2);

    loadCmpStub.restore();
  });

  it('should display fields when a custom object node is selected', async () => {
    const loadComponentsStub = stub(ComponentUtils.prototype, 'loadComponents');

    const customObjectBrowserNodes = [
      new BrowserNode('Account', NodeType.Folder, 'Account', undefined),
      new BrowserNode('Asset', NodeType.Folder, 'Asset', undefined),
      new BrowserNode('Book__c', NodeType.Folder, 'Book__c', undefined),
      new BrowserNode('Campaign', NodeType.Folder, 'Campaign', undefined),
      new BrowserNode('Customer Case', NodeType.Folder, 'Customer Case', undefined)
    ];
    const customObjectNames = [
      'Account',
      'Asset',
      'Book__c',
      'Campaign',
      'Customer Case'
    ];
    loadComponentsStub
      .withArgs(username, 'CustomObject', undefined, false)
      .returns(Promise.resolve(customObjectNames));

    const bookFieldBrowserNodes = [
      new BrowserNode('Id (id)', NodeType.MetadataField, 'Id (id)', undefined),
      new BrowserNode('Owner (reference)', NodeType.MetadataField, 'Owner (reference)', undefined),
      new BrowserNode('IsDeleted (boolean)', NodeType.MetadataField, 'IsDeleted (boolean)', undefined),
      new BrowserNode('Name (string(80))', NodeType.MetadataField, 'Name (string(80))', undefined),
      new BrowserNode('CreatedDate (datetime)', NodeType.MetadataField, 'CreatedDate (datetime)', undefined),
      new BrowserNode('CreatedBy (reference)', NodeType.MetadataField, 'CreatedBy (reference)', undefined),
      new BrowserNode('LastModifiedDate (datetime)', NodeType.MetadataField, 'LastModifiedDate (datetime)', undefined),
      new BrowserNode('LastModifiedBy (reference)', NodeType.MetadataField, 'LastModifiedBy (reference)', undefined),
      new BrowserNode('SystemModstamp (datetime)', NodeType.MetadataField, 'SystemModstamp (datetime)', undefined),
      new BrowserNode('Price__c (currency)', NodeType.MetadataField, 'Price__c (currency)', undefined)
    ];
    const bookFieldNames = [
      'Id (id)',
      'Owner (reference)',
      'IsDeleted (boolean)',
      'Name (string(80))',
      'CreatedDate (datetime)',
      'CreatedBy (reference)',
      'LastModifiedDate (datetime)',
      'LastModifiedBy (reference)',
      'SystemModstamp (datetime)',
      'Price__c (currency)'
    ];
    loadComponentsStub
      .withArgs(username, 'CustomObject', 'Book__c', false)
      .returns(Promise.resolve(bookFieldNames));

    const customObjectMetadataObject = {
      directoryName: 'objects',
      inFolder: false,
      label: 'Custom Objects',
      metaFile: false,
      suffix: 'object',
      xmlName: 'CustomObject'
    };

    const customObjectNode = new BrowserNode(
      'Custom Objects',
      NodeType.MetadataType,
      'CustomObject',
      customObjectMetadataObject
    );

    const customObjects = await metadataProvider.getChildren(customObjectNode);
    compareNodes(customObjects, customObjectBrowserNodes);

    const fields = await metadataProvider.getChildren(customObjects[2]);
    compareNodes(fields, bookFieldBrowserNodes);

    loadComponentsStub.restore();
  });

  it('should call loadComponents with force refresh', async () => {
    const loadCmpStub = stub(
      ComponentUtils.prototype,
      'loadComponents'
    ).returns([]);
    const metadataObject = {
      xmlName: 'typeNode1',
      directoryName: 'testDirectory',
      suffix: 'cls',
      inFolder: false,
      metaFile: false,
      label: 'Type Node 1'
    };
    const node = new BrowserNode(
      'ApexClass',
      NodeType.MetadataType,
      undefined,
      metadataObject
    );

    await metadataProvider.getChildren(node);
    expect(loadCmpStub.getCall(0).args[3]).to.be.false;

    await metadataProvider.refresh(node);
    await metadataProvider.getChildren(node);
    expect(loadCmpStub.getCall(1).args[3]).to.be.true;

    await metadataProvider.getChildren(node);
    expect(loadCmpStub.getCall(2).args[3]).to.be.false;

    loadCmpStub.restore();
  });

  it('should call loadTypes with force refresh', async () => {
    const loadTypesStub = stub(TypeUtils.prototype, 'loadTypes').returns([]);
    const usernameStub = stub(
      MetadataOutlineProvider.prototype,
      'getDefaultUsernameOrAlias'
    ).returns(username);
    const node = new BrowserNode(username, NodeType.Org);

    await metadataProvider.getChildren(node);
    expect(loadTypesStub.getCall(0).args[1]).to.be.false;

    await metadataProvider.refresh();
    await metadataProvider.getChildren(node);
    expect(loadTypesStub.getCall(1).args[1]).to.be.true;

    await metadataProvider.getChildren(node);
    expect(loadTypesStub.getCall(2).args[1]).to.be.false;

    loadTypesStub.restore();
    usernameStub.restore();
  });
});

// Can't compare nodes w/ deep.equal because of circular parent node reference
function compareNodes(actual: BrowserNode[], expected: any[]) {
  expected.forEach((node, index) => {
    Object.keys(node).forEach(key => {
      expect((actual[index] as any)[key]).to.equal((node as any)[key]);
    });
  });
}

describe('parse errors and throw with appropriate message', () => {
  it('should return default message when given a dirty json', async () => {
    const error = `< Warning: sfdx-cli update available +
      ${JSON.stringify({ status: 1, name: 'RetrievingError' })}`;
    const errorResponse = parseErrors(error);
    expect(errorResponse.message).to.equal(
      `${nls.localize('error_fetching_metadata')} ${nls.localize(
        'error_org_browser_text'
      )}`
    );
  });

  it('should return authorization token message when throwing RefreshTokenAuthError', async () => {
    const error = JSON.stringify({ status: 1, name: 'RefreshTokenAuthError' });
    const errorResponse = parseErrors(error);
    expect(errorResponse.message).to.equal(
      `${nls.localize('error_auth_token')} ${nls.localize(
        'error_org_browser_text'
      )}`
    );
  });

  it('should return no org found message when throwing NoOrgFound error', async () => {
    const error = JSON.stringify({ status: 1, name: 'NoOrgFound' });
    const errorResponse = parseErrors(error);
    expect(errorResponse.message).to.equal(
      `${nls.localize('error_no_org_found')} ${nls.localize(
        'error_org_browser_text'
      )}`
    );
  });
});
