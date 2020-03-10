/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;
require('date-utils');

class Record extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const records = [
            {
                user_id: 'user_test1',
                value: {
                    access_list: [
                        {
                            role: 'doctor',
                            id: 'doctor_test1'
                        },
                    ],
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test2'
                        },
                    ],
                    medical_info: [
                        {
                            date: '2020/01/01 12:00:00',
                            writer_id: 'doctor_test1',
                            information: 'fracture',
                        }
                    ]
                }
            },
            {
                user_id: 'user_test2',
                value: {
                    access_list: [
                        {
                            role: 'doctor',
                            id: 'doctor_test2'
                        },
                        {
                            role: 'patient',
                            id: 'user_test1'
                        }
                    ],
                    medical_info: [
                        {
                            date: '2020/01/01 12:00:00',
                            writer_id: 'doctor_test2',
                            information: 'cold',
                        },
                    ]
                }
            },
            {
                user_id: 'doctor_test1',
                value: {
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test1'
                        },
                    ],
                }
            },
            {
                user_id: 'doctor_test2',
                value: {
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test2'
                        },
                    ],
                }
            },
            {
                user_id: 'doctor_test3',
                value: {
                    access_list: [],
                    allowed_list: [],
                }
            },
        ];

        for (let i = 0; i < records.length; i++) {
            // records[i].value.docType = 'record';
            await ctx.stub.putState(records[i].user_id, Buffer.from(JSON.stringify(records[i].value)));
            console.info('Added <--> ', records[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createPatientRecord(ctx){
        const record = {
            access_list: [],
            allowed_list: [],
            medical_info: [],
        }

        const id = this.getCallerId(ctx);

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(record)));

        return id;
    }

    // async createDoctorRecord(){}

    async writePatientRecord(ctx, patientId, info){
        const caller = this.getCallerId(ctx);

        let cid = new ClientIdentity(ctx.stub);
        if (!cid.assertAttributeValue("role", "doctor")) {
            throw new Error('Only doctor can write recored');
        }

        // Get record
        const recordAsByte = await ctx.stub.getState(patientId);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${patientId} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Check permission
        const permission = record.access_list.filter(access => {
            return access.id == caller;
        });
        if (!permission || permission.length === 0) {
            throw new Error(`${caller} is not allowed to modify the record`);
        }
        
        // Write record
        var now = new Date();
        const medical_info = {
            date: now.toFormat("YYYY/MM/DD PP HH:MI"),
            writer_id: caller,
            information: info,
        }
        record.medical_info.push(medical_info);

        return await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(record)));
    }

    async getMyMedicalInfo(ctx){
        const caller = this.getCallerId(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        return JSON.stringify(record.medical_info);
    }

    async getMedicalInfoByPatientId(ctx, requesterId, patientId){
        // Get record
        const recordAsByte = await ctx.stub.getState(patientId);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${patientId} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Check permission
        const permission = record.access_list.filter(access => {
            return access.id == requesterId;
        });
        if (!permission || permission.length === 0) {
            throw new Error(`${requesterId} is not allowed to modify the record`);
        }

        return JSON.stringify(record.medical_info);
    }

    // async getDoctorList(ctx){
    //     //  *all doctor role users*
    //     const caller = 'user_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(caller);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${caller} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     // Filter doctors
    //     const doctors = record.access_list.filter(access => {
    //         return access.role == 'doctor';
    //     });

    //     return JSON.stringify(doctors);
    // }

    // async getAccessList(ctx){
    //     // *all permission users*
    //     const caller = 'user_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(caller);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${caller} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     return JSON.stringify(record.access_list);
    // }

    // async checkMyPermissionStatus(ctx, patientId){
    //     // *check if I’m allowed by patientID*
    //     const caller = 'doctor_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(patientId);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${patientId} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     // Check permission
    //     const permission = record.access_list.filter(access => {
    //         return access.id == caller;
    //     });
    //     if (!permission || permission.length === 0) {
    //         return false
    //     }

    //     return true;
    // }

    // async addPermission(ctx, id, role){
    //     const caller = 'user_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(caller);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${caller} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     // Add permission
    //     const permission = record.access_list.filter(access => {
    //         return access.id == id;
    //     });
    //     if (!permission || permission.length === 0) {
    //         record.access_list.push = {
    //             role: role,
    //             id: id,
    //         }
    //     }

    //     await ctx.stub.putState(caller, Buffer.from(JSON.stringify(record)));
    //     return true;
    // }

    // async deletePermission(ctx, id){
    //     const caller = 'user_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(caller);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${caller} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     // Delete permission
    //     const permission = record.access_list.filter(access => {
    //         return access.id != id;
    //     });
    //     record.access_list = permission;

    //     await ctx.stub.putState(caller, Buffer.from(JSON.stringify(record)));
    //     return true;
    // }







    // async queryCar(ctx, carNumber) {
    //     const carAsBytes = await ctx.stub.getState(carNumber);
    //     if (!carAsBytes || carAsBytes.length === 0) {
    //         throw new Error(`${carNumber} does not exist`);
    //     }
    //     console.log(carAsBytes.toString());
    //     return carAsBytes.toString();
    // }

    // async createRecord(ctx, carNumber, make, model, color, owner) {
    //     console.info('============= START : Create Car ===========');
    //     const attr = ctx.stub.getAttributeValue();
    //     console.log(attr);
    //     // if (!ctx.stub.assertAttributeValue('hf.role', 'doctor')) {
    //     //     console.error('Only doctor can create record');
    //     //     return false;
    //     // }
    //     // proceed to carry out auditing

    //     const car = {
    //         color,
    //         docType: 'car',
    //         make,
    //         model,
    //         owner,
    //     };

    //     await ctx.stub.putState(carNumber, Buffer.from(JSON.stringify(car)));
    //     console.info('============= END : Create Car ===========');
    // }

    getCallerId(ctx) {
        let cid = new ClientIdentity(ctx.stub);
        const idString = cid.getID();// "x509::{subject DN}::{issuer DN}"
        const idParams = idString.toString().split('::');
        return idParams[1].split('CN=')[1];

    }

    async getUserId(ctx) {
        const id = this.getCallerId(ctx);

        return id;
    }

    // async getId(ctx) {
    //     let cid = new ClientIdentity(ctx.stub);
    //     const id = cid.getMSPID();

    //     return id.toString('utf8');
    // }

    // async getUserAttr(ctx) {
    //     let cid = new ClientIdentity(ctx.stusb);
    //     const role = cid.getAttributeValue('role');

    //     return role;
    // }
    
    // async queryAllCars(ctx, id) {
    //     console.log('===== START : queryAllCars =====')

    //     const startKey = 'Record0';
    //     const endKey = 'Record999';

    //     const iterator = await ctx.stub.getStateByRange(startKey, endKey);

    //     const allResults = [];
    //     while (true) {
    //         const res = await iterator.next();

    //         if (res.value && res.value.value.toString()) {
    //             console.log(res.value.value.toString('utf8'));

    //             const Key = res.value.key;
    //             let Record;
    //             try {
    //                 Record = JSON.parse(res.value.value.toString('utf8'));
    //             } catch (err) {
    //                 console.log(err);
    //                 Record = res.value.value.toString('utf8');
    //             }
    //             allResults.push({ Key, Record });
    //         }
    //         if (res.done) {
    //             console.log('end of data');
    //             await iterator.close();
    //             console.info(allResults);
    //             return JSON.stringify(allResults);
    //         }
    //     }
    // }

    // async changeCarOwner(ctx, carNumber, newOwner) {
    //     console.info('============= START : changeCarOwner ===========');

    //     const carAsBytes = await ctx.stub.getState(carNumber);
    //     if (!carAsBytes || carAsBytes.length === 0) {
    //         throw new Error(`${carNumber} does not exist`);
    //     }
    //     const car = JSON.parse(carAsBytes.toString());
    //     car.owner = newOwner;

    //     await ctx.stub.putState(carNumber, Buffer.from(JSON.stringify(car)));
    //     console.info('============= END : changeCarOwner ===========');
    // }

}

module.exports = Record;
