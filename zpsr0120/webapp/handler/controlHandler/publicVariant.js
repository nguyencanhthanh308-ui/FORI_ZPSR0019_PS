sap.ui.define(
	["sap/ui/model/json/JSONModel", "sap/ui/Device"],
	/**
	 * provide app-view type models (as in the first "V" in MVVC)
	 *
	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
	 * @param {typeof sap.ui.Device} Device
	 *
	 * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
	 */
	function (JSONModel) {
		"use strict";
		/**
		 * Get table column setting
		 */
		const getColumnSetting = function (oTable) {
			const aColumns = oTable.getColumns();
			// get default columns setting in the table
			const aColumnsData = [];
			aColumns.forEach(function (oColumn, index) {
				const aColumn = {};
				aColumn.fieldName = oColumn.getProperty("name");
				aColumn.Id = oColumn.getId();
				aColumn.index = index;
				aColumn.visible = oColumn.getVisible();
				aColumn.sortOder = oColumn.getSortOrder();
				aColumn.sorted = oColumn.getSorted();
				aColumn.filterValue = oColumn.getFilterValue();
				aColumn.filtered = oColumn.getFiltered();
				aColumn.width = oColumn.getWidth();
				aColumnsData.push(aColumn);
			});
			return aColumnsData;
		};
		return {
			/**
			 * Handle connect to the personalization service
			 */
			connectPersonalizationService: async function (oController, sNameVariantSet, oGlobalData) {
				const oView = oController.getView();
				const oTable = oController._getTableControl();
				const oColumnConfig = getColumnSetting(oTable);
				const oVariantModel = oView.getModel("VariantList");
				const oVariantManagement = oView.byId("Variants");
				const oUserInfo = sap.ushell.Container.getService("UserInfo").getUser();
				const aGlobalData = oGlobalData.results;
				let aResultData = [];

				// Init default variant item
				if (!oVariantModel) {
					aResultData.push({
						key: "DEFAULT",
						name: "デフォルト",
						sharing: "public",
						changeable: false,
						author: "",
						contexts: oColumnConfig,
					});
				}

				const oComponent = sap.ui.core.Component.getOwnerComponentFor(oView);
				const oUShellService = sap.ushell.Container.getService("Personalization");
				// define scope
				const oScope = {
					keyCategory: oUShellService.constants.keyCategory.FIXED_KEY,
					writeFrequency: oUShellService.constants.writeFrequency.LOW,
					clientStorageAllowed: true,
				};
				// Get a Personalizer Container
				const oContainer = oUShellService.getContainer("TablePersonalisation", oScope, oComponent);
				await oContainer
					.fail(function () {})
					.done(
						async function (oContainer) {
							oController.oContainer = oContainer;
							const oVariantAdapter = new sap.ushell.services.Personalization.VariantSetAdapter(
								oController.oContainer
							);

							oController.oVariantSet = oVariantAdapter.getVariantSet(sNameVariantSet);

							if (!oController.oVariantSet) {
								oController.oVariantSet = oVariantAdapter.addVariantSet(sNameVariantSet);
							}

							const sCurrentVariantKey = oController.oVariantSet.getCurrentVariantKey();

							const aVariantKeys = oController.oVariantSet.getVariantKeys();
							// Get user variant
							const aVariantModel = aVariantKeys.reduce((aAccmulator, sVariantKeys) => {
								const oVariant = oController.oVariantSet.getVariant(sVariantKeys);
								const oVariantData = oVariant.getItemValue("value");
								if (!oVariantData) {
									oController.oVariantSet.delVariant(sVariantKeys);
								} else {
									aAccmulator.push(oVariantData);
								}
								return aAccmulator;
							}, []);

							aResultData = [...aResultData, ...aVariantModel];
							const aPreviosName = aResultData.map((oItem) => oItem.name);
							let sLastKey = parseInt(aResultData[aResultData.length - 1].key) || 0;
							// Get global variant
							if (aGlobalData.length) {
								const aListGlobalExistData = aGlobalData.reduce((aAccumulator, oGlobalItem) => {
									const oUserValue = JSON.parse(oGlobalItem.value);
									const aUserVariant = oUserValue.variants;
									const aKeys = Object.keys(aUserVariant) || [];
									if (aKeys.length) {
										const aVariantData = aKeys.reduce((oAccVariant, sKey) => {
											const oValue = aUserVariant[sKey]?.variantData?.value;
											if (
												oValue &&
												oGlobalItem.user_id !== oUserInfo.getId() &&
												oValue.sharing === "public"
											) {
												oValue.key = (sLastKey + 1).toString();
												oValue.changeable = false;
												if (!aPreviosName.includes(oValue.name)) {
													oAccVariant.push(oValue);
													sLastKey++;
												}
											}
											return oAccVariant;
										}, []);
										aAccumulator = [...aAccumulator, ...aVariantData];
									}
									return aAccumulator;
								}, []);
								aResultData = [...aResultData, ...aListGlobalExistData];
							}
							oView.setModel(new JSONModel(aResultData), "VariantList");
							oVariantManagement.attachSelect(
								function (oEvent) {
									this.onSelect(oEvent, oController);
								}.bind(this)
							);

							oVariantManagement.attachSave(
								function (oEvent) {
									this.onSave(oEvent, oController);
								}.bind(this)
							);

							oVariantManagement.attachManage(
								function (oEvent) {
									this.onManage(oEvent, oController);
								}.bind(this)
							);

							// Set default keys
							if (sCurrentVariantKey && sCurrentVariantKey !== "*standard*") {
								const oDefaultVariant = aResultData.find((oItem) => oItem.name === sCurrentVariantKey);
								const oDefaultKey = oDefaultVariant?.key || "DEFAULT";

								oVariantManagement.setDefaultKey(oDefaultKey);
								oVariantManagement.setSelectedKey(oDefaultKey);
								oVariantManagement.fireSelect({ key: oDefaultKey });
							} else {
								oVariantManagement.fireSelect({ key: "DEFAULT" });
							}
							await oController.oContainer.save().done();
						}.bind(this)
					);
			},

			/**
			 * handle save when click the button [save as], rename in the popup manager
			 */
			onSave: async function (oEvent, oController) {
				const oTable = oController._getTableControl();
				const oColumnConfig = getColumnSetting(oTable);
				const oParameters = oEvent.getParameters();
				const oSource = oEvent.getSource();
				const oModel = oController._getModelByName("VariantList");
				const aModelData = oModel.getData();
				const oUserInfo = sap.ushell.Container.getService("UserInfo").getUser();

				// Case override variant
				if (oParameters.overwrite) {
					const sVariantKey = oController.oVariantSet.getVariantKeyByName(oParameters.name);
					const oVariant = oController.oVariantSet.getVariant(sVariantKey);
					const oVariantControl = oSource.getItemByKey(oParameters.key);
					const oDataByKey = aModelData.find((oItem) => oItem.key === oParameters.key);
					oVariantControl.setProperty("contexts", oColumnConfig);
					if (oVariant) {
						oVariant.setItemValue("value", oDataByKey);
					}
				} else {
					// Case create new variant
					const oVariant = oController.oVariantSet.addVariant(oParameters.name);
					const aKeys = aModelData.map((oKey) => oKey.key).filter((sKey) => sKey !== "DEFAULT");
					const aKeySorted = aKeys.sort((a, b) => b - a);
					const sLastKey = parseInt(aKeySorted[0]) || 0;
					const sKey = aKeySorted[0] === undefined ? "0" : (sLastKey + 1).toString();
					const oNewVariant = {
						key: sKey,
						name: oParameters.name,
						sharing: oParameters.public ? "public" : "private",
						changeable: true,
						author: oUserInfo.getId(),
						contexts: oColumnConfig,
					};
					aModelData.push(oNewVariant);
					oVariant.setItemValue("value", oNewVariant);
					if (oParameters.def) {
						oController.oVariantSet.setCurrentVariantKey(oNewVariant.name);
						oSource.setDefaultKey(oNewVariant.key);
					}
					oSource.setSelectedKey(oNewVariant.key);
				}
				oSource.setModified(false);
				oModel.refresh();
				await oController.oContainer.save().done();
			},

			/**
			 * handle logic when select the variant in the VariantManagement list
			 */
			onSelect: function (oEvent, oController) {
				const oTable = oController._getTableControl();
				const aTableColumns = oTable.getColumns();
				const sVariantKey = oEvent.getParameter("key");
				const oSource = oEvent.getSource();
				const oSelectedItem = oSource.getItemByKey(sVariantKey);
				const aContexts = oSelectedItem.getContexts();

				const aSortItems = [];
				if (sVariantKey !== "DEFAULT") {
					aTableColumns.forEach((oColumn) => {
						const oVariantColumn = aContexts.find((oItem) => oItem.Id === oColumn.getId());
						if (oVariantColumn) {
							oColumn.setVisible(oVariantColumn.visible);
							if (oVariantColumn.sorted) {
								aSortItems.push({
									oColumn: oColumn,
									sSortOrder: oVariantColumn.sortOder,
									bAdd: oVariantColumn.sorted,
								});
							} else {
								oColumn.setSorted(false);
							}
							oColumn.setWidth(oVariantColumn.width);
							oTable.removeColumn(oColumn);
							oTable.insertColumn(oColumn, oVariantColumn.index);
						}
					});
					if (aSortItems.length) {
						aSortItems.forEach((oItem) => {
							oTable.sort(oItem.oColumn, oItem.sSortOrder, oItem.bAdd);
						});
					} else {
						oTable.sort();
					}
					oSource.setModified(false);
				} else {
					// Init default sort
					const aSortDefaultLabels = ["受注伝票番号", "受注明細番号"];
					aTableColumns.forEach((oColumn) => {
						const oVariantColumn = aContexts.find((oItem) => oItem.Id === oColumn.getId());
						if (oVariantColumn) {
							oColumn.setVisible(oVariantColumn.visible);
							const sLabel = oColumn.getLabel?.().getText?.();
							if (aSortDefaultLabels.includes(sLabel)) {
								aSortItems.push({
									oColumn: oColumn,
									sSortOrder: "Ascending",
									bAdd: true,
								});
							} else {
								oColumn.setSorted(false);
							}
							oColumn.setWidth(oVariantColumn.width);
							oTable.removeColumn(oColumn);
							oTable.insertColumn(oColumn, oVariantColumn.index);
						}
					});
					if (aSortItems.length) {
						aSortItems.forEach((oItem) => {
							oTable.sort(oItem.oColumn, oItem.sSortOrder, oItem.bAdd);
						});
					} else {
						oTable.sort();
					}
				}
			},

			/**
			 * handle logic when click button [OK] Manager popup
			 * @param {*} oEvent
			 */
			onManage: async function (oEvent, oController) {
				const oView = oController.getView();
				const oModel = oController._getModelByName("VariantList");
				const aModelData = oModel.getData();
				const oSource = oEvent.getSource();
				const oParameters = oEvent.getParameters();
				const sDefaultKey = oParameters.def || oSource.getDefaultKey();

				oSource.setDefaultKey(sDefaultKey);
				const oDefaultVariant = aModelData.find((oItem) => oItem.key === sDefaultKey);

				oController.oVariantSet.setCurrentVariantKey(sDefaultKey === "DEFAULT" ? "" : oDefaultVariant.name);

				if (oParameters.renamed) {
					oParameters.renamed.forEach((oItem) => {
						const oExistVariantModel = aModelData.find((oModelData) => oModelData.key === oItem.key);
						if (oExistVariantModel) {
							const sPreviousName = oExistVariantModel.name;
							const sVariantKey = oController.oVariantSet.getVariantKeyByName(sPreviousName);
							const oExistPersonal = oController.oVariantSet.getVariant(sVariantKey);
							oExistVariantModel.name = oItem.name;
							oExistPersonal.setItemValue("value", oExistVariantModel);
							oExistPersonal.setVariantName(oItem.name);
						}
					});
				}

				if (oParameters.deleted) {
					const aDeleteModel = aModelData.filter((oItem) => oParameters.deleted.includes(oItem.key));
					aDeleteModel.forEach((oModel) => {
						const sDeleteKey = oController.oVariantSet.getVariantKeyByName(oModel.name);
						oController.oVariantSet.delVariant(sDeleteKey);
					});
					oSource.setSelectedKey(sDefaultKey);
					oSource.fireSelect({ key: sDefaultKey });
				}
				const aRestData = aModelData.filter((oItem) => !oParameters?.deleted?.includes(oItem.key));
				oView.setModel(new JSONModel([]), "VariantList");
				oView.setModel(new JSONModel(aRestData), "VariantList");

				await oController.oContainer.save().done();
			},

			/**
			 * set variant into table after search
			 */
			applyVariantAfterSearch: function (oController) {
				const oView = oController.getView();
				const oVariantManagement = oView.byId("Variants");
				const sKey = oVariantManagement.getSelectedKey();
				oVariantManagement.fireSelect({ key: sKey });
			},
		};
	}
);
