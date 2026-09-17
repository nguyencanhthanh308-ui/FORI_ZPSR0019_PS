// sap.ui.define(
// 	["sap/ui/model/json/JSONModel"],
// 	/**
// 	 * provide app-view type models (as in the first "V" in MVVC)
// 	 *
// 	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
// 	 * @param {typeof sap.ui.Device} Device
// 	 *
// 	 * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
// 	 */
// 	function (JSONModel) {
// 		"use strict";

// 		return {
// 			/**
// 			 * connect to the Personalization service
// 			 */
// 			connectPersonalizationService: async function (oView, sNameVariantSet, sVariantId) {
// 				const oTable = oView.byId("table");
// 				// hide table before service connection and arrange for optimal UX
// 				oTable.setVisible(false);
// 				// get and set setting property default in table
// 				this.aColumnsDefault = this.getColumnSetting(oTable);
// 				// Peronalisation from ushell service to persist the settings
// 				if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
// 					const oComponent = sap.ui.core.Component.getOwnerComponentFor(oView);
// 					this.oPersonalizationService = sap.ushell.Container.getService("Personalization");
// 					// define scope
// 					const oScope = {
// 						keyCategory: this.oPersonalizationService.constants.keyCategory.FIXED_KEY,
// 						writeFrequency: this.oPersonalizationService.constants.writeFrequency.LOW,
// 						clientStorageAllowed: true,
// 					};
// 					// Get a Personalizer Container
// 					this._oPersonalizationContainer = this.oPersonalizationService.getContainer(
// 						"TablePersonalisation",
// 						oScope,
// 						oComponent
// 					);
// 					await this._oPersonalizationContainer
// 						.fail(function (err) {})
// 						.done(
// 							function (oContainer) {
// 								this.oContainer = oContainer;
// 								this.oVariantSetAdapter = new sap.ushell.services.Personalization.VariantSetAdapter(
// 									this.oContainer
// 								);
// 								// get variant set which is stored in backend
// 								this.oVariantSet = this.oVariantSetAdapter.getVariantSet(sNameVariantSet);

// 								if (!this.oVariantSet) {
// 									//if not in backend, then create one
// 									this.oVariantSet = this.oVariantSetAdapter.addVariantSet(sNameVariantSet);
// 								}
// 								// get the defaultKey, stored in the variantSet
// 								let defaultKey = this.oVariantSet.getCurrentVariantKey();
// 								// get the VariantManager
// 								const oVariantManager = this.getVariantManager(oView);
// 								if (sVariantId) {
// 									defaultKey = Number(sVariantId);
// 								}
// 								// set the selection key is the defaultKey in VariantManagement
// 								// set the selected default key (in manager popup) is defaultKey
// 								if (defaultKey !== "*Standard*") {
// 									oVariantManager.setInitialSelectionKey(defaultKey);
// 									oVariantManager.setDefaultVariantKey(defaultKey);
// 								}

// 								// set Model for display exist variant
// 								this.handleSetVariantList(oView);
// 							}.bind(this)
// 						);
// 				}
// 				oTable.setVisible(true);
// 			},

// 			getColumnSetting: function (oTable) {
// 				const aColumns = oTable.getColumns();
// 				// get default columns setting in the table
// 				const aColumnsData = [];
// 				aColumns.forEach(function (oColumn, index) {
// 					const aColumn = {};
// 					aColumn.fieldName = oColumn.getProperty("name");
// 					aColumn.Id = oColumn.getId();
// 					aColumn.index = index;
// 					aColumn.visible = oColumn.getVisible();
// 					aColumn.sortOder = oColumn.getSortOrder();
// 					aColumn.sorted = oColumn.getSorted();
// 					aColumn.filterValue = oColumn.getFilterValue();
// 					aColumn.filtered = oColumn.getFiltered();
// 					aColumn.width = oColumn.getWidth();
// 					aColumnsData.push(aColumn);
// 				});
// 				return aColumnsData;
// 			},

// 			/**
// 			 * handle save when click the button [save as], rename in the popup manager
// 			 */
// 			onSaveAs: async function (oEvent, oView) {
// 				// get variant parameters:
// 				const oVariantParam = oEvent.getParameters();
// 				const oVariantManager = this.getVariantManager(oView);
// 				// const oVariantManagement = this.getVariantManager();
// 				// get columns data
// 				const oTable = oView.byId("table");
// 				const aColumnsData = this.getColumnSetting(oTable);
// 				const skeyGenerated = oVariantParam.key;
// 				// set oVariantParam.key is the index in the VariantManagement list by generate key
// 				if (oVariantParam.key.includes("SV")) {
// 					oVariantParam.key = this.handleGetKeyByGenerateKey(oVariantParam.key, oView);
// 				}

// 				this.oVariant = this.oVariantSet.getVariant(oVariantParam.key);
// 				if (!this.oVariant) {
// 					this.oVariant = await this.oVariantSet.addVariant(oVariantParam.name);
// 				}

// 				if (this.oVariant) {
// 					await this.oVariant.setItemValue("ColumnsVal", JSON.stringify(aColumnsData));
// 					// if set as default is selected, set current variant is it
// 					if (oVariantParam.def === true) {
// 						const sKey = this.oVariant.getVariantKey();
// 						this.oVariantSet.setCurrentVariantKey(sKey);
// 						oVariantManager.setDefaultVariantKey(skeyGenerated);
// 					}
// 					await this.oContainer.save().done(
// 						function () {
// 							// handle your logic
// 							this.handleSetVariantList(oView);
// 							oVariantManager.setSelectionKey(skeyGenerated);
// 						}.bind(this)
// 					);
// 					// fix bug when add the first item to variantlist, it hasn't been selected in variant management, and can't set as default
// 					if (!oVariantManager._getSelectedItem().oBindingContexts.VariantList) {
// 						oVariantManager._setSelectionByKey(oVariantParam.key);
// 						if (oVariantParam.def === true) {
// 							oVariantManager.setDefaultVariantKey(oVariantParam.key);
// 						}
// 					}
// 				}
// 			},

// 			/**
// 			 * handle logic when select the variant in the VariantManagement list
// 			 */
// 			onSelect: function (oEvent, oView) {
// 				// flag to disable process show [save] button when trigger sort
// 				this.bSelecting = true;

// 				const selectedKey = oEvent.getParameter("key");
// 				const aItems = this.getVariantManager(oView)._getItems();
// 				let selectedVariant;
// 				for (let i = 0; i < aItems.length; i++) {
// 					if (aItems[i].getProperty("key") === selectedKey) {
// 						selectedVariant = aItems[i].getProperty("text");
// 						break;
// 					}
// 				}
// 				// case selected a variant, and then delete it in the manager popup
// 				// selected reset to the "standard", and can't get the sKey
// 				const sKey = this.oVariantSet.getVariantKeyByName(selectedVariant);
// 				this.handleBindVariantToTable(oView, sKey);

// 				this.bSelecting = false;
// 			},

// 			/**
// 			 * handle sort and visibility the column with the data stored in
// 			 * @param {*} sKey
// 			 */
// 			handleBindVariantToTable: function (oView, sKey) {
// 				const oTable = oView.byId("table");
// 				if (sKey) {
// 					const oVariant = this.oVariantSet.getVariant(sKey);
// 					const aColumns = JSON.parse(oVariant.getItemValue("ColumnsVal"));
// 					// Hide all columns first
// 					oTable.getColumns().forEach(function (oColumn) {
// 						oColumn.setVisible(false);
// 					});

// 					const aSortColumn = [];
// 					// re-arrange columns according to the saved variant
// 					aColumns.forEach(
// 						function (aColumn) {
// 							let aTableColumn = $.grep(oTable.getColumns(), function (element) {
// 								return element.getId() === aColumn.Id;
// 							});
// 							if (aTableColumn.length > 0) {
// 								aTableColumn[0].setVisible(aColumn.visible);
// 								if (aColumn.sorted) {
// 									aSortColumn.push({
// 										oColumn: aTableColumn[0],
// 										sSortOrder: aColumn.sortOder,
// 										bAdd: aColumn.sorted,
// 									});
// 								} else {
// 									aTableColumn[0].setSorted(false);
// 								}
// 								if (aColumn.filtered) {
// 									oTable.filter(aTableColumn[0], aColumn.filterValue);
// 								} else {
// 									aTableColumn[0].setFiltered(false);
// 								}
// 								aTableColumn[0].setWidth(aColumn.width);
// 								oTable.removeColumn(aTableColumn[0]);
// 								oTable.insertColumn(aTableColumn[0], aColumn.index);
// 							}
// 						}.bind(this)
// 					);
// 					aSortColumn.forEach((oItem) => {
// 						oTable.sort(oItem.oColumn, oItem.sSortOrder, oItem.bAdd);
// 					});
// 				}
// 				// null means the standard variant is selected or the variant which is not available, then show all columns
// 				else {
// 					// remove all the sort, filter property
// 					const aColumnsDefault = this.aColumnsDefault;
// 					aColumnsDefault.forEach(function (oColumnOrigin) {
// 						const aTableColumn = oTable
// 							.getColumns()
// 							.filter((oColumn) => oColumn.getId() === oColumnOrigin.Id);
// 						aTableColumn[0].setFiltered(false);
// 						aTableColumn[0].setSorted(false);
// 						aTableColumn[0].setVisible(oColumnOrigin.visible);
// 						aTableColumn[0].setWidth(oColumnOrigin.width);
// 						oTable.removeColumn(aTableColumn[0]);
// 						oTable.insertColumn(aTableColumn[0], oColumnOrigin.index);
// 					});
// 				}
// 			},

// 			/**
// 			 * handle logic when click button [OK] Manager popup
// 			 * @param {*} oEvent
// 			 */
// 			onManage: async function (oEvent, oView) {
// 				const aParameters = oEvent.getParameters();
// 				const oVariantManagement = this.getVariantManager(oView);
// 				// rename variants
// 				if (aParameters.renamed.length > 0) {
// 					aParameters.renamed.forEach(
// 						async function (aRenamed) {
// 							if (aRenamed.key.includes("SV")) {
// 								aRenamed.key = this.handleGetKeyByGenerateKey(aRenamed.key, oView);
// 							}
// 							const sVariant = this.oVariantSet.getVariant(aRenamed.key);
// 							sVariant.setVariantName(aRenamed.name);
// 						}.bind(this)
// 					);
// 				}
// 				// Delete variants
// 				if (aParameters.deleted.length > 0) {
// 					aParameters.deleted.forEach(
// 						function (sDeletedKey) {
// 							if (sDeletedKey.includes("SV")) {
// 								sDeletedKey = this.handleGetKeyByGenerateKey(sDeletedKey, oView);
// 							}
// 							this.oVariantSet.delVariant(sDeletedKey);
// 						}.bind(this)
// 					);
// 				}
// 				// default variant change
// 				if (aParameters.def !== "*standard*") {
// 					let sDef = aParameters.def;
// 					if (sDef.includes("SV")) {
// 						const sKey = this.handleGetKeyByGenerateKey(sDef, oView);
// 						sDef = sKey;
// 					}
// 					this.oVariantSet.setCurrentVariantKey(sDef);
// 					oVariantManagement.setDefaultVariantKey(sDef);
// 				} else {
// 					this.oVariantSet.setCurrentVariantKey("*standard*");
// 					oVariantManagement.setDefaultVariantKey("*standard*");
// 				}
// 				this.oContainer
// 					.save()
// 					.fail(function (err) {})
// 					.done(function () {}.bind(this));
// 			},

// 			/**
// 			 * Handle show the button save when resort, and save in the curent variant
// 			 */
// 			onDisplaySaveButton: async function (oView) {
// 				const oVariant = this.getVariantManager(oView);
// 				const sSelectionKey = oVariant.getSelectionKey();
// 				// don't need show save button if trigger sort when connect service,
// 				// when select the variant, and when the current variant is 'Standard'
// 				if (sSelectionKey === null || this.bSelecting || sSelectionKey === "*standard*") {
// 					oVariant.currentVariantSetModified(false);
// 				} else {
// 					oVariant.currentVariantSetModified(true);
// 				}
// 			},

// 			/**
// 			 * Gets the index of the variant with the specified generated key in the variant list.
// 			 *
// 			 * @function
// 			 * @param {string} sGenerateKey - The generated key of the variant to search for.
// 			 * @returns {string} The index of the variant with the specified generated key in the variant list as a string, or an empty string if not found.
// 			 */
// 			handleGetKeyByGenerateKey: function (sGenerateKey, oView) {
// 				// Get list of variant in the VariantManagement
// 				const aItems = this.getVariantManager(oView)._getItems();
// 				const index = aItems.findIndex((item) => item.getProperty("key") === sGenerateKey);
// 				return index !== -1 ? index.toString() : "";
// 			},

// 			/**
// 			 * get the name and key of the variant, and set to the model
// 			 */
// 			handleSetVariantList: function (oView) {
// 				const Variants = [];
// 				// now get the existing variants from the backend to show as list
// 				const aVariantNameAndKey = this.oVariantSet.getVariantNamesAndKeys();
// 				for (let key in aVariantNameAndKey) {
// 					if (aVariantNameAndKey.hasOwnProperty(key)) {
// 						// swap key - value in oVariantNameAndKey
// 						const oVariantItemObject = {};
// 						oVariantItemObject.Key = aVariantNameAndKey[key];
// 						oVariantItemObject.Name = key;
// 						Variants.push(oVariantItemObject);
// 					}
// 				}
// 				// create JSON model and attach to the variant management UI control
// 				oView.setModel(new JSONModel(Variants), "VariantList");
// 			},

// 			/**
// 			 * get control variant management
// 			 */
// 			getVariantManager: function (oView) {
// 				return oView.byId("Variants");
// 			},

// 			/**
// 			 * set variant into table after search
// 			 */
// 			handleBindVariantAfterChange: function (oView) {
// 				this.bSelecting = true;
// 				let sSelectedKey = this.getVariantManager(oView).getSelectionKey();
// 				if (sSelectedKey?.includes("SV")) {
// 					sSelectedKey = this.handleGetKeyByGenerateKey(sSelectedKey, oView);
// 				} else if (sSelectedKey === "*standard*") {
// 					sSelectedKey = null;
// 				}
// 				this.handleBindVariantToTable(oView, sSelectedKey);
// 				this.bSelecting = false;
// 				return Promise.resolve();
// 			},
// 		};
// 	}
// );
