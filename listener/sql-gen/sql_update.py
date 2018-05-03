#! /usr/bin/python
# -*- coding: UTF-8 -*-
import time, sys, os, json, sys
import sql_create

UPDATE_SQL = """
USE `%s`;

DELIMITER ;;
CREATE PROCEDURE db_update()
BEGIN
    SELECT @id:=MAX(id) from db_version;
    SELECT @db_ver:=version from db_version where id = @id;
    
    %s

    INSERT INTO db_version(version, update_time) VALUES(%d, utc_timestamp());
END;;

DELIMITER ;

CALL db_update();

DROP PROCEDURE db_update;
"""


def __gen_field_update(old_tbl, new_tbl, tbl_name):
    old_fields = [(tbl["name"], tbl)  for tbl in old_tbl["fields"]]
    new_fields = [(tbl["name"], tbl)  for tbl in new_tbl["fields"]]
    old_fields_dict = {}
    for t in old_fields:
        old_fields_dict[t[0]] = t[1]
    new_fields_dict = {}
    for t in new_fields:
        new_fields_dict[t[0]] = t[1]

    old_len = len(old_fields_dict)
    new_len = len(new_fields_dict)

    old_fields_set = set(old_fields_dict.keys())
    new_fields_set = set(new_fields_dict.keys())

    drop_field = list(old_fields_set.difference(new_fields_set))
    modified_field = list(old_fields_set.intersection(new_fields_set))
    add_field = list(new_fields_set.difference(old_fields_set))

    # print(tbl_name)
    # print("drop:",drop_field)
    # print("modify:", modified_field)
    # print("add:", add_field)

    #print(old_fields, new_fields)
    sql = ""

    keys = []
    #print("old_len:%d, new_len:%d" % (old_len, new_len))

    # drop field process
    if len(drop_field) > 0:
        for d in drop_field:
            sql += "ALTER TABLE %s DROP %s;\n" % (tbl_name, d)

    # add field process
    for field_name in add_field:
        new_field = new_fields_dict[field_name]
        sql += ("ALTER TABLE %s ADD %s" % (tbl_name, sql_create.generate_field(new_field, keys))).replace(',',';')

    # modified field process
    for field_name in modified_field:
        old_field = old_fields_dict[field_name]
        new_field = new_fields_dict[field_name]
        if(old_field != new_field):
            sql += ("ALTER TABLE %s MODIFY %s" % (tbl_name, sql_create.generate_field(new_field, keys))).replace(',',';')

    # if old_len > new_len:
    #     #print("del field")
    #     sql += "ALTER TABLE %s DROP %s;" % (tbl_name, old_fields_set.difference(new_fields_set))
    # elif old_len < new_len:
    #     #print("add field")
    #     for field_name in new_fields_dict.keys():
    #         if field_name not in old_fields_set:
    #             new_field = new_fields_dict[field_name]
    #             sql += ("ALTER TABLE %s ADD %s" % (tbl_name, sql_create.generate_field(new_field, keys))).replace(',',';')
    # else:
    #     #print("modify field")
    #     for field_name in old_fields_dict.keys():
    #         old_field = old_fields_dict[field_name]
    #         new_field = new_fields_dict[field_name]
    #         if(old_field != new_field):
    #             sql += ("ALTER TABLE %s MODIFY %s" % (tbl_name, sql_create.generate_field(new_field, keys))).replace(',',';')

    if len(sql) != 0:
        sql += "\n"
    return sql

def __gen_table_update(schema, old_ver, new_ver):
    print("old_ver:%d, new_ver:%d" % (old_ver, new_ver))
    old_db = schema[old_ver]
    new_db = schema[new_ver]
    old_tbl_num = len(old_db["table"])
    new_tbl_num = len(new_db["table"])

    old_tbl_set = set(old_db["table"].keys())
    new_tbl_set = set(new_db["table"].keys())

    # print(new_tbl_set.difference(old_tbl_set))
    # print(old_tbl_set.difference(new_tbl_set))
    sql = ""

    for tbl_name in old_tbl_set.difference(new_tbl_set):
        sql += "DROP TABLE %s;\n" % (tbl_name)

    for tbl_name in new_tbl_set.difference(old_tbl_set):
        sql += sql_create.generate_table(tbl_name, new_db["table"][tbl_name])

    for tbl_name in new_tbl_set.intersection(old_tbl_set):
        sql += __gen_field_update(old_db["table"][tbl_name], new_db["table"][tbl_name], tbl_name)

    return sql + "\n"

def gen_update(dir):
    relative_path = []
    for root, dirs, files in os.walk(dir, topdown=False):
        for f in files:
            file_root, ext = os.path.splitext(f)
            path = os.path.join(root, f)

            if(ext == ".json"):
                relative_path.append(path)

    assert(len(relative_path) > 1)
    schema = {}
    for p in relative_path:
        with open(p, 'r') as f:
            schm = json.load(f)
            assert(schm)
            file_root, ext = os.path.splitext(os.path.basename(p))
            if(len(file_root.split("db_v")) <= 1):
                continue
            file_ver = int(file_root.split("db_v")[1])
            assert(int(schm["version"]) == file_ver)
            schema[file_ver] = schm
            # print(file_ver)
            # print(schema.keys())
            # if(file_ver > 1):
            #     assert(schema[file_ver]["name"] == schema[file_ver - 1]["name"])

    ctx = ""
    update_sql = {}
    db_name = schema[1]["name"]
    version = max([int(x) for x in schema.keys()])
    key_list = sorted(schema.keys())
    for i in range(0,len(schema) - 1):
    	update_sql[key_list[i]] = __gen_table_update(schema, key_list[i], key_list[i + 1])

    update_sql_key_list = sorted(update_sql)
    for k in update_sql_key_list:
        v = update_sql[k]
        ctx += "IF(@db_ver <= %d)THEN\n%s\nEND IF;\n" % (k, v)

    sql = UPDATE_SQL % (db_name, ctx, version)


    sql_file = open("%s_update.sql" % (db_name), 'wb')
    sql_file.write(sql.encode("UTF-8"))
    sql_file.flush()
    sql_file.close()

if __name__ == "__main__":
    gen_update("./database")
    # raw_input()
