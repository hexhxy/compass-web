
(function() {
    define(['./baseController'], function() {
        'use strict';
        return angular.module('compass.controllers').controller('wizardCtrl', [
            '$scope', 'wizardService', '$state', '$stateParams', 'clusterData', 'adaptersData', 'machinesHostsData', 'wizardStepsData', 'clusterConfigData',
            function($scope, wizardService, $state, $stateParams, clusterData, adaptersData, machinesHostsData, wizardStepsData, clusterConfigData) {
                wizardService.wizardInit($scope, $stateParams.id, clusterData, adaptersData, wizardStepsData, machinesHostsData, clusterConfigData);
                $scope.skipForward = function(nextStepId) {
                    if ($scope.currentStep !== nextStepId) {
                        $scope.pendingStep = nextStepId;
                        return wizardService.triggerCommitByStepById($scope, $scope.currentStep, nextStepId);
                    }
                };
                $scope.stepControl = function(goToPrevious) {
                    return wizardService.stepControl($scope, goToPrevious);
                };
                $scope.stepForward = function() {
                    $scope.pendingStep = $scope.currentStep + 1;
                    return wizardService.triggerCommitByStepById($scope, $scope.currentStep, $scope.pendingStep);
                };
                $scope.stepBackward = function() {
                    $scope.pendingStep = $scope.currentStep - 1;
                    return wizardService.triggerCommitByStepById($scope, $scope.currentStep, $scope.pendingStep);
                };
                $scope.deploy = function() {
                    return wizardService.deploy($scope);
                };
                $scope.$on('loading', function(event, data) {
                    return $scope.loading = data;
                });
                wizardService.setSubnetworks();
                return wizardService.watchingCommittedStatus($scope);
            }
        ]).controller('svSelectCtrl', [
            '$scope', 'wizardService', '$filter', 'ngTableParams', '$modal',
            function($scope, wizardService, $filter, ngTableParams, $modal) {
                $scope.hideunselected = '';
                $scope.search = {};
                $scope.cluster = wizardService.getClusterInfo();
                $scope.allservers = wizardService.getAllMachinesHost();
                $scope.allAddedSwitches = [];
                wizardService.getServerColumns().success(function(data) {
                    $scope.server_columns = [];
                    for (var i = 0; i < data.showall.length; i++) {
                        if (data.showall[i].field != "switch_ip" && data.showall[i].field != "port") {
                            $scope.server_columns.push(data.showall[i]);
                        };
                    };
                    return $scope.server_columns;
                });

                wizardService.displayDataInTable($scope, $scope.allservers);
                wizardService.watchingTriggeredStep($scope);
                $scope.hideUnselected = function() {
                    if ($scope.hideunselected) {
                        return $scope.search.selected = true;
                    } else {
                        return delete $scope.search.selected;
                    }
                };
                $scope.ifPreSelect = function(server) {
                    var svCluster, _i, _len, _ref, _results;
                    server.disable = false;
                    if (server.clusters) {
                        if (server.clusters.length > 0) {
                            server.disabled = true;
                        }
                        _ref = server.clusters;
                        _results = [];
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            svCluster = _ref[_i];
                            if (svCluster.id === $scope.cluster.id) {
                                server.selected = true;
                                _results.push(server.disabled = false);
                            } else {
                                _results.push(void 0);
                            }
                        }
                        return _results;
                    }
                };
                $scope.selectAllServers = function(flag) {
                    var sv, _i, _j, _len, _len1, _ref, _ref1, _results, _results1;
                    if (flag) {
                        _ref = $scope.allservers;
                        _results = [];
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            sv = _ref[_i];
                            if (!sv.disabled) {
                                _results.push(sv.selected = true);
                            }
                        }
                        return _results;
                    } else {
                        _ref1 = $scope.allservers;
                        _results1 = [];
                        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                            sv = _ref1[_j];
                            _results1.push(sv.selected = false);
                        }
                        return _results1;
                    }
                };
                $scope.uploadFile = function() {
                    var modalInstance;
                    return modalInstance = $modal.open({
                        templateUrl: "src/app/partials/modalUploadFiles.html",
                        controller: "uploadFileModalInstanceCtrl",
                        resolve: {
                            allSwitches: function() {
                                return $scope.allAddedSwitches;
                            },
                            allMachines: function() {
                                return $scope.foundResults;
                            }
                        }
                    });
                };
                $scope.addNewMachines = function() {
                    var modalInstance;
                    return modalInstance = $modal.open({
                        templateUrl: "src/app/partials/modalAddNewServers.html",
                        controller: "addMachineModalInstanceCtrl",
                        resolve: {
                            allSwitches: function() {
                                return $scope.allAddedSwitches;
                            },
                            allMachines: function() {
                                return $scope.foundResults;
                            }
                        }
                    });
                };
                wizardService.watchAndAddNewServers($scope);
                return $scope.commit = function(sendRequest) {
                    return wizardService.svSelectonCommit($scope);
                };
            }
        ]).controller('globalCtrl', [
            '$scope', 'wizardService', '$q',
            function($scope, wizardService, $q) {
                wizardService.globalConfigInit($scope);
                wizardService.buildOsGlobalConfigByMetaData($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.addValue = function(category, key) {
                    if (!$scope.os_global_config[category][key]) {
                        scope.os_global_config[category][key] = [];
                    }
                    return $scope.os_global_config[category][key].push("");
                };
                return $scope.commit = function(sendRequest) {
                    return wizardService.globalCommit($scope, sendRequest);
                };
            }
        ]).controller('networkCtrl', [
            '$rootScope', '$scope', 'wizardService', 'dataService', 'ngTableParams', '$modal', '$timeout', '$cookieStore',
            function($rootScope, $scope, wizardService, dataService, ngTableParams, $modal, $timeout, $cookieStore) {
                wizardService.networkInit($scope);
                wizardService.watchingTriggeredStep($scope);

                if ($scope.cluster.adapter_name.toLowercase().startsWith("openstack")) {
                    // can use regex as well: "^(openstack.*$).*"
                    if (!$scope.package_config.network_cfg || $scope.package_config.network_cfg == undefined) {
                        $scope.package_config["network_cfg"] = {};
                        $scope.package_config["network_cfg"]["provider_net_mappings"] = [];
                        var pnm = {"name": "br-provider", "network": "physnet", "interface": "eth1", "type": "ovs"}
                        $scope.package_config["network_cfg"]["provider_net_mappings"].push(pnm);
                        $scope.providers = $scope.package_config.network_cfg.provider_net_mappings;
                        $scope.tenant_net = $scope.package_config.network_cfg.tenant_net_info;
                    } else {
                        $scope.providers = [];
                        $scope.tenant_net = [];
                    }
                }

                $scope.ok = function() {
                    return wizardService.subnetCommit($scope);
                  };

                $scope.addInterface = function(newInterface) {
                    return wizardService.addInterface($scope, newInterface);
                };
                $scope.deleteInterface = function(delInterface) {
                    var sv, _i, _len, _ref, _results;
                    delete $scope.interfaces[delInterface];
                    _ref = $scope.servers;
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        sv = _ref[_i];
                        _results.push(delete sv.networks[delInterface]);
                    }
                    return _results;
                };
                $scope.selectAsInstallInterface = function(evt, name) {
                    var checkbox, n;
                    checkbox = evt.target;
                    if (!checkbox.checked) {
                        return;
                    }
                    for (n in $scope.interfaces) {
                        if (n !== name) {
                            $scope.interfaces[n].is_mgmt = false;
                        }
                    }
                };
                $scope.openAddSubnetModal = function() {
                    var modalInstance;
                    modalInstance = $modal.open({
                        templateUrl: "src/app/partials/modalAddSubnet.tpl.html",
                        controller: "addSubnetModalInstanceCtrl",
                        resolve: {
                            subnets: function() {
                                return $scope.subnetworks;
                            }
                        }
                    });
                    return modalInstance.result.then(function(subnets) {
                        $scope.subnetworks = subnets;
                        return wizardService.setSubnetworks($scope.subnetworks);
                    }, function() {
                        return console.log("modal dismissed");
                    });
                };
                $scope.openAddProviderModal = function(size) {
                    var modalInstance;
                    modalInstance = $modal.open({
                        templateUrl: "src/app/partials/modalAddProviderNw.tpl.html",
                        controller: "addProviderModalInstanceCtrl",
                        size: size,
                        resolve: {
                            providers: function() {
                                return $scope.providers;
                            },
                            package_config: function() {
                                return $scope.package_config;
                            },
                            cluster_id: function() {
                                return $scope.cluster.id;
                            }
                        }
                    });
                    return modalInstance.result.then(function(providers, package_config, cluster_id) {
                        $scope.providers = providers;
                        $scope.package_config = package_config;
                        $scope.cluster.id = cluster_id;
                    }, function() {
                        return console.log("modal dismissed");
                    });
                };

                $scope.commit = function(sendRequest) {
                    var installInterface, name, subnet, value, _i, _len, _ref, _ref1;
                    installInterface = {};
                    $rootScope.networkMappingInterfaces = {};
                    _ref = $scope.interfaces;
                    for (name in _ref) {
                        value = _ref[name];
                        if (value.is_mgmt) {
                            installInterface[name] = value;
                        }
                        _ref1 = $scope.subnetworks;
                        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                            subnet = _ref1[_i];
                            if (('' + subnet.id) === ('' + value.subnet_id)) {
                                $rootScope.networkMappingInterfaces[name] = subnet;
                            }
                        }
                        $rootScope.networkMappingInterfaces[name].subnet_id = value.subnet_id;
                        $rootScope.networkMappingInterfaces[name].is_mgmt = value.is_mgmt;
                    }
                    $scope.interfaces = installInterface;
                    $cookieStore.put('networkMappingInterfaces', $rootScope.networkMappingInterfaces);
                    return wizardService.networkCommit($scope, sendRequest);
                };
                return wizardService.getClusterHosts($scope.cluster.id).success(function(data) {
                    $scope.servers = data;
                    $scope.interfaces = $cookieStore.get('networkMappingInterfaces');
                    wizardService.setInterfaces($scope.interfaces);
                    return wizardService.displayDataInTable($scope, $scope.servers);
                });
            }
        ]).controller('partitionCtrl', [
            '$scope', 'wizardService',
            function($scope, wizardService) {
                wizardService.partitionInit($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.addPartition = function() {
                    return wizardService.addPartition($scope);
                };
                $scope.deletePartition = function(index) {
                    return wizardService.deletePartition($scope, index);
                };
                $scope.commit = function(sendRequest) {
                    return wizardService.partitionCommit($scope, sendRequest);
                };
                $scope.mount_point_change = function(index, name) {
                    return wizardService.mount_point_change($scope, index, name);
                };
                return $scope.$watch('partitionInforArray', function() {
                    var partitionInfo, total, _i, _len, _ref;
                    $scope.partitionarray = [];
                    total = 0;
                    _ref = $scope.partitionInforArray;
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        partitionInfo = _ref[_i];
                        total += parseFloat(partitionInfo.percentage);
                        $scope.partitionarray.push({
                            "name": partitionInfo.name,
                            "number": partitionInfo.percentage
                        });
                    }
                    return $scope.partitionarray.push({
                        "name": "others",
                        "number": 100 - total
                    });
                }, true);
            }
        ]).controller('packageConfigCtrl', [
            '$scope', 'wizardService',
            function($scope, wizardService) {
                wizardService.targetSystemConfigInit($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.mSave = function() {
                    return $scope.originalMangementData = angular.copy($scope.console_credentials);
                };
                $scope.sSave = function() {
                    return $scope.originalServiceData = angular.copy($scope.service_credentials);
                };
                $scope.mSave();
                $scope.sSave();
                console.log($scope.console_credentials);
                $scope.mEdit = function(index) {
                    var em, i, _i, _len, _ref;
                    _ref = $scope.editMgntMode;
                    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
                        em = _ref[i];
                        if (i !== index) {
                            $scope.editMgntMode[i] = false;
                        } else {
                            $scope.editMgntMode[i] = true;
                        }
                    }
                    return $scope.mReset();
                };
                $scope.mReset = function() {
                    return $scope.console_credentials = angular.copy($scope.originalMangementData);
                };
                $scope.commit = function(sendRequest) {
                    return wizardService.targetSystemConfigCommit($scope, sendRequest);
                };
                return $scope.addValue = function(key1, key2, key3) {
                    if (!$scope.package_config[key1][key2][key3]) {
                        $scope.package_config[key1][key2][key3] = [];
                    }
                    return $scope.package_config[key1][key2][key3].push("");
                };
            }
        ]).controller('roleAssignCtrl', [
            '$scope', 'wizardService', '$filter', 'ngTableParams',
            function($scope, wizardService, $filter, ngTableParams) {
                wizardService.roleAssignInit($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.selectAllServers = function(flag) {
                    var sv, _i, _j, _len, _len1, _ref, _ref1, _results, _results1;
                    if (flag) {
                        _ref = $scope.servers;
                        _results = [];
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            sv = _ref[_i];
                            _results.push(sv.checked = true);
                        }
                        return _results;
                    } else {
                        _ref1 = $scope.servers;
                        _results1 = [];
                        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                            sv = _ref1[_j];
                            _results1.push(sv.checked = false);
                        }
                        return _results1;
                    }
                };
                $scope.assignRole = function(role) {
                    return wizardService.assignRole($scope, role);
                };
                $scope.removeRole = function(server, role) {
                    var roleIndex, role_key, role_value, serverIndex, _i, _len, _ref;
                    serverIndex = $scope.servers.indexOf(server);
                    roleIndex = $scope.servers[serverIndex].roles.indexOf(role);
                    $scope.servers[serverIndex].roles.splice(roleIndex, 1);
                    _ref = $scope.roles;
                    for (role_key = _i = 0, _len = _ref.length; _i < _len; role_key = ++_i) {
                        role_value = _ref[role_key];
                        if (role.name === $scope.roles[role_key].name) {
                            $scope.existingRoles[serverIndex].splice(role_key, 1, role_key);
                        }
                    }
                    return $scope.servers[serverIndex].dropChannel = $scope.existingRoles[serverIndex].toString();
                };
                $scope.onDrop = function($event, server) {
                    return $scope.dragKey = $scope.servers.indexOf(server);
                };
                $scope.dropSuccessHandler = function($event, role_value, key) {
                    var roleExist;
                    roleExist = wizardService.checkRoleExist($scope.servers[$scope.dragKey].roles, role_value);
                    if (!roleExist) {
                        $scope.servers[$scope.dragKey].roles.push(role_value);
                    } else {
                        console.log("role exists");
                    }
                    return wizardService.checkExistRolesDrag($scope);
                };
                $scope.autoAssignRoles = function() {
                    return wizardService.autoAssignRoles($scope);
                };
                $scope.haMultipleNodeAssignRoles = function() {
                    var i, role, rolesHash, _i, _j, _k, _len, _ref, _ref1;
                    rolesHash = {};
                    _ref = $scope.roles;
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        role = _ref[_i];
                        rolesHash[role.name] = role;
                    }
                    for (i = _j = 0; _j < 3; i = ++_j) {
                        $scope.servers[i].roles = [];
                        $scope.servers[i].roles.push(rolesHash['controller']);
                        $scope.servers[i].roles.push(rolesHash['ha']);
                        $scope.servers[i].roles.push(rolesHash['ceph-mon']);
                        if (i === 0) {
                            $scope.servers[i].roles.push(rolesHash['odl']);
                            $scope.servers[i].roles.push(rolesHash['onos']);
                            $scope.servers[i].roles.push(rolesHash['ceph-adm']);
                        }
                    }
                    for (i = _k = 3, _ref1 = $scope.servers.length; 3 <= _ref1 ? _k < _ref1 : _k > _ref1; i = 3 <= _ref1 ? ++_k : --_k) {
                        $scope.servers[i].roles = [];
                        $scope.servers[i].roles.push(rolesHash['compute']);
                        $scope.servers[i].roles.push(rolesHash['ceph-osd']);
                    }
                };
                $scope.commit = function(sendRequest) {
                    return wizardService.roleAssignCommit($scope, sendRequest);
                };
                return wizardService.displayDataInTable($scope, $scope.servers);
            }
        ]).controller('networkMappingCtrl', [
            '$scope', 'wizardService', '$cookieStore',
            function($scope, wizardService, $cookieStore) {
                var configureNetworkCfg, configureNetworkMapping, configureNeutronCfg, defaultCfg, readCfg, saveCfg;
                wizardService.networkMappingInit($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.allservers = wizardService.getAllMachinesHost();
                $scope.allAddedSwitches = [];
                $scope.full_selected_subnets = [];
                $scope.selected_subnets = [];
                $scope.intersected_hosts = [];

                console.log($scope.subnetworks);

                for (var i=0; i<$scope.subnetworks.length; i++){
                    console.log("I am heree");
                    if ($scope.subnetworks[i]['selected'] == true) {
                        console.log($scope.subnetworks[i]);
                        $scope.selected_subnets.push($scope.subnetworks[i]['name']);
                        $scope.full_selected_subnets.push($scope.subnetworks[i]);
                    }
                }
                
                console.log($scope.selected_subnets);
                console.log($scope.full_selected_subnets);

                for(var i=0; i<$scope.allservers.length; i++){
                    $scope.intersected_hosts.push(Object.keys($scope.allservers[i]['mac']));
                }

                var join = $scope.intersected_hosts.reduce((join, current) => join.filter(el => current.includes(el)));

                $scope.common_hosts = join;

                wizardService.getServerColumns().success(function(data) {
                    $scope.server_columns = [];
                    for (var i = 0; i < data.showall.length; i++) {
                        if (data.showall[i].field != "switch_ip" && data.showall[i].field != "port" && data.showall[i].field != "os_name" && data.showall[i].field != "os_installed") {
                            $scope.server_columns.push(data.showall[i]);
                        };
                    };
                    return $scope.server_columns;
                });

                wizardService.displayDataInTable($scope, $scope.allservers);

                $scope.autoFillManage = function(subnet_name, subnet_startip, subnet_endip, subnet_interface, subnet_vlan) {
                    $scope.auto = true;
                    $scope.subnet_name = subnet_name;
                    $scope.autofill_subnet_interface = subnet_interface;
                    $scope.autofill_subnet_vlan = subnet_vlan;
                    $scope.autofill_subnet_startip = subnet_startip;
                    $scope.autofill_subnet_endip = subnet_endip;

                    console.log($scope.allservers);
                    console.log($scope.subnet_name);
                    console.log($scope.autofill_subnet_startip);
                    console.log($scope.autofill_subnet_vlan);

                    wizardService.fillIPBySequence($scope, $scope.autofill_subnet_startip, 1, $scope.subnet_name);
                };

                $scope.autofill = function(alertFade) {
                    var hostname_rule, interval, ip_start, key, value, _ref;
                    _ref = $scope.interfaces;
                    for (key in _ref) {
                        value = _ref[key];
                        ip_start = $("#" + key + "-ipstart").val();
                        interval = parseInt($("#" + key + "-increase-num").val());
                        wizardService.fillIPBySequence($scope, ip_start, interval, key);
                    }
                    hostname_rule = $("#hostname-rule").val();
                    wizardService.fillHostname($scope, hostname_rule);
                    $scope.networkAlerts = [{
                        msg: 'Autofill Done!'
                    }];
                    if (alertFade) {
                        return $timeout(function() {
                            return $scope.networkAlerts = [];
                        }, alertFade);
                    }
                };

                $scope.updateInternalNetwork = function(network_name) {
                    if ($scope.ips[network_name].cidr.split('.') < 4) {
                        return;
                    }
                    $scope.ips[network_name].start = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips[network_name].start.split('.')[3];
                    $scope.ips[network_name].end = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips[network_name].end.split('.')[3];
                    if (network_name === 'mgmt') {
                        $scope.ips.mgmt.internal_vip = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips.mgmt.internal_vip.split('.')[3];
                    }
                };
                $scope.updateExternalNetwork = function(network_name) {
                    var error, nic;
                    nic = $scope.external[network_name];
                    try {
                        if ($scope.interfaces[nic]) {
                            $scope.ips[network_name].cidr = $scope.interfaces[nic].subnet;
                        }
                        $scope.ips[network_name].start = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips[network_name].start.split('.')[3];
                        $scope.ips[network_name].end = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips[network_name].end.split('.')[3];
                        if (network_name === 'external') {
                            $scope.ips.external.public_vip = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips.external.public_vip.split('.')[3];
                            $scope.ips.external.gw_ip = $scope.ips[network_name].cidr.split('.').slice(0, 3).join('.') + '.' + $scope.ips.external.gw_ip.split('.')[3];
                        }
                    } catch (_error) {
                        error = _error;
                        console.log(error);
                    }
                };
                defaultCfg = function() {
                    $scope.internal = {
                        mgmt: 'eth0',
                        storage: 'eth1',
                        external: 'eth1',
                        tenant: 'eth1'
                    };

                    $scope.external = {
                        external: 'eth1'
                    }

                    $scope.vlanTags = {
                        mgmt: '101',
                        storage: '102',
                        external: '103',
                        tenant: '104'
                    };

                    $scope.ips = {
                        mgmt: {
                            start: '',
                            end: '',
                            cidr: '',
                            internal_vip: ''
                        },
                        external: {
                            start: '',
                            end: '',
                            cidr: '',
                            gw_ip: '',
                            public_vip: ''
                        },
                        storage: {
                            start: '',
                            end: '',
                            cidr: ''
                        },
                        tenant: {
                            start: '',
                            end: '',
                            cidr: ''
                        }
                    };
                    $scope.updateExternalNetwork('external');
                };
                saveCfg = function() {
                    var networkMapping;
        
                    networkMapping = {
                        internal: $scope.internal,
                        external: $scope.external,
                        vlanTags: $scope.vlanTags,
                        ips: $scope.ips
                    };
                    $cookieStore.put('networkMapping', networkMapping);
                };
                readCfg = function() {
                    var networkMapping;
                    $scope.interfaces = $cookieStore.get('networkMappingInterfaces');
                    networkMapping = $cookieStore.get('networkMapping');
                    if (!networkMapping) {
                        return defaultCfg();
                    }
                    $scope.internal = networkMapping.internal;
                    $scope.external = networkMapping.external;
                    $scope.vlanTags = networkMapping.vlanTags;
                    $scope.ips = networkMapping.ips;
                };
                configureNeutronCfg = function() {
                    var neutronCfg;
                    neutronCfg = {
                        'openvswitch': {
                            'tenant_network_type': 'vxlan',
                            'network_vlan_ranges': ['physnet:1:4094'],
                            'bridge_mappings': ['physnet:br-prv']
                        }
                    };
                    return neutronCfg;
                };
                configureNetworkCfg = function() {
                    var networkCfg;
                    networkCfg = {
                        'bond_mappings': [],
                        'sys_intf_mappings': [{
                            'interface': $scope.internal.mgmt,
                            'role': ['controller', 'compute'],
                            'vlan_tag': $scope.vlanTags.mgmt,
                            'type': 'vlan',
                            'name': 'mgmt'
                        }, {
                            'interface': $scope.internal.storage,
                            'role': ['controller', 'compute'],
                            'vlan_tag': $scope.vlanTags.storage,
                            'type': 'vlan',
                            'name': 'storage'
                        }, {
                            'interface': 'br-prv',
                            'role': ['controller', 'compute'],
                            'type': 'ovs',
                            'name': 'external'
                        }],
                        'nic_mappings': [],
                        'public_net_info': {
                            'no_gateway': 'False',
                            'external_gw': $scope.ips.external.gw_ip,
                            'enable': 'False',
                            'floating_ip_cidr': $scope.ips.external.cidr,
                            'floating_ip_start': $scope.ips.external.start,
                            'floating_ip_end': $scope.ips.external.end,
                            'provider_network': 'physnet',
                            'subnet': 'ext-subnet',
                            'network': 'ext-net',
                            'enable_dhcp': 'False',
                            'segment_id': 1000,
                            'router': 'router-ext',
                            'type': 'vlan'
                        },
                        'internal_vip': {
                            'interface': 'mgmt',
                            'ip': $scope.ips.mgmt.internal_vip,
                            'netmask': wizardService.getNetMaskFromCIDR($scope.ips.mgmt.cidr)
                        },
                        'public_vip': {
                            'interface': 'external',
                            'ip': $scope.ips.external.public_vip,
                            'netmask': wizardService.getNetMaskFromCIDR($scope.ips.external.cidr)
                        },
                        'provider_net_mappings': [{
                            'interface': $scope.internal.mgmt,
                            'role': ['controller', 'compute'],
                            'type': 'ovs',
                            'name': 'br-prv',
                            'network': 'physnet'
                        }],
                        'ip_settings': [{
                            'cidr': $scope.ips.mgmt.cidr,
                            'role': ['controller', 'compute'],
                            'name': 'mgmt',
                            'ip_ranges': [
                                [$scope.ips.mgmt.start, $scope.ips.mgmt.end]
                            ]
                        }, {
                            'cidr': $scope.ips.storage.cidr,
                            'role': ['controller', 'compute'],
                            'name': 'storage',
                            'ip_ranges': [
                                [$scope.ips.storage.start, $scope.ips.storage.end]
                            ]
                        }, {
                            'gw': $scope.ips.external.gw_ip,
                            'cidr': $scope.ips.external.cidr,
                            'role': ['controller', 'compute'],
                            'name': 'external',
                            'ip_ranges': [
                                [$scope.ips.external.start, $scope.ips.external.end]
                            ]
                        }]
                    };
                    return networkCfg;
                };
                configureNetworkMapping = function() {
                    var installNic, nic, nicName, value, _ref;
                    installNic = {};
                    nicName = '';
                    _ref = $scope.interfaces;
                    for (nic in _ref) {
                        value = _ref[nic];
                        if (value.is_mgmt) {
                            installNic = value;
                        }
                        if (value.is_mgmt) {
                            nicName = nic;
                        }
                    }
                    $scope.networkMapping = {
                        'install': {
                            'interface': nicName,
                            'subnet': installNic.subnet
                        }
                    };
                };
                configureNetworkMapping();
                readCfg();
                return $scope.commit = function(sendRequest) {
                    var networkCfg, neutronCfg;
                    networkCfg = configureNetworkCfg();
                    neutronCfg = configureNeutronCfg();
                    saveCfg();
                    return wizardService.networkMappingCommit($scope, networkCfg, $scope.networkMapping, neutronCfg, sendRequest);
                };
            }
        ])
        .controller('reviewCtrl', [
            '$scope', 'wizardService', 'ngTableParams', '$filter', '$location', '$anchorScroll',
            function($scope, wizardService, ngTableParams, $filter, $location, $anchorScroll) {
                wizardService.reviewInit($scope);
                wizardService.watchingTriggeredStep($scope);
                $scope.scrollTo = function(id) {
                    var old;
                    old = $location.hash();
                    $location.hash(id);
                    $anchorScroll();
                    return $location.hash(old);
                };
                $scope.commit = function(sendRequest) {
                    return wizardService.reviewCommit($scope, sendRequest);
                };
                return wizardService.displayDataInTable($scope, $scope.servers);
            }
        ]).animation('.fade-animation', [
            function() {
                return {
                    enter: function(element, done) {
                        element.css('display', 'none');
                        element.fadeIn(500, done);
                        return function() {
                            return element.stop();
                        };
                    },
                    leave: function(element, done) {
                        element.fadeOut(500, done);
                        return function() {
                            return element.stop();
                        };
                    }
                };
            }
        ]);
    });

}).call(this);