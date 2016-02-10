// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace, ModuleExports, ImportSpec} from './xml/Namespace';
import {Type, TypeSpec, MemberSpec} from './xml/Type';
export {Rule} from './xml/Rule';
export {BaseClass} from './xml/BaseClass';

export {ContextBase} from './xml/ContextBase';
export {Context} from './xml/Context';
export {NamespaceBase} from './xml/NamespaceBase';

/** Tuple: parent type ID, child element list, attribute list */
export type RawTypeSpec = [ number, MemberSpec[], MemberSpec[] ];

var pendingNamespaceList: ModuleExports[] = [];
var pendingTypeList: TypeSpec[] = [];
var pendingCount = 0;

var namespaceList: Namespace[] = [];
var typeList: TypeSpec[] = [];

function mark(exports: ModuleExports, namespace?: Namespace) {
	if(!exports._cxml) {
		exports._cxml = [null];
		pendingNamespaceList.push(exports);
		++pendingCount;
	}

	if(namespace) exports._cxml[0] = namespace;
}

function process(pendingNamespaceList: ModuleExports[], pendingTypeList: TypeSpec[]) {
	// Link types to their parents.

	for(var exportObject of pendingNamespaceList) {
		var namespace = exportObject._cxml[0];
		namespace.link();
	}

	// Create classes for all types.
	// This is effectively Kahn's algorithm for topological sort
	// (the rest is in the TypeSpec class).

	for(var typeSpec of pendingTypeList) {
		if(!typeSpec.parent || typeSpec.parent == typeSpec) {
			typeSpec.defineType();
		}
	}

	for(var typeSpec of pendingTypeList) {
		typeSpec.defineMembers();
	}

	for(var exportObject of pendingNamespaceList) {
		var namespace = exportObject._cxml[0];

		namespace.exportTypes(exportObject);
		namespace.exportDocument(exportObject);
	}
}

export function register(
	name: string,
	exportObject: ModuleExports,
	importSpecList: ImportSpec[],
	exportTypeNameList: string[],
	rawTypeSpecList: RawTypeSpec[]
) {
	var typeSpecList: TypeSpec[] = [];
	var exportTypeCount = exportTypeNameList.length;
	var typeCount = rawTypeSpecList.length;
	var typeName: string;

	var namespace = new Namespace(name, importSpecList);
	namespaceList.push(namespace);

	for(var typeNum = 0; typeNum < typeCount; ++typeNum) {
		var rawSpec = rawTypeSpecList[typeNum];

		if(typeNum > 0 && typeNum <= exportTypeCount) {
			typeName = exportTypeNameList[typeNum - 1];
		} else typeName = null;

		var typeSpec = new TypeSpec(namespace, typeName, rawSpec[0], rawSpec[1], rawSpec[2]);

		namespace.addType(typeSpec);
		pendingTypeList.push(typeSpec);
		typeList.push(typeSpec);
	}

	mark(exportObject, namespace);

	for(var spec of importSpecList) mark(spec[0]);
	if(--pendingCount == 0) {
		process(pendingNamespaceList, pendingTypeList);

		pendingNamespaceList = [];
		pendingTypeList = [];
	}
}

export function init(strict?: boolean) {
	for(var namespace of namespaceList) {
		namespace.importSpecList = null;
		namespace.exportTypeNameList = null;
		namespace.typeSpecList = null;
		namespace.exportTypeTbl = null;
	}

	for(var typeSpec of typeList) {
		typeSpec.cleanPlaceholders(strict);
	}

	namespaceList = null;
	typeList = null;
}
