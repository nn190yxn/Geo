# 竞品地图发现需求文档

## Introduction

本需求把竞品维护从“手动填写品牌名称”升级为“地图 POI 辅助发现、系统评分、人工勾选确认”。系统围绕品牌所在城市和线下服务场景发现候选机构，帮助品牌方区分本地直接竞品、校区周边重点竞品、全国标杆品牌和应排除对象。第一版面向追光小牛内测，候选范围限定为贵阳市线下儿童运动相关机构。

## Glossary

- **竞品地图发现**: 系统通过地图 POI、品牌档案和筛选规则生成线下候选竞品的流程。
- **全城候选**: 以品牌经营城市为范围检索到的候选线下机构。
- **校区周边重点竞品**: 位于品牌校区服务半径内的候选机构，用于识别真实到店选择场景。
- **直接竞品**: 与品牌处于相同城市、相近品类、相近客群和相近购买理由的线下机构。
- **间接竞品**: 与品牌满足相同家庭需求但课程品类存在差异的线下机构。
- **全国标杆品牌**: 可用于品牌心智、内容表达和行业对标的全国连锁品牌或知名品牌。
- **候选机构**: 地图 POI 或用户补充形成的待确认机构。
- **竞品确认标签**: 用户对候选机构选择的确认结果，包括直接竞品、间接竞品、本地替代机构、全国标杆品牌和排除。

## Requirements

### Requirement 1: 竞品发现入口

**User Story:** AS 品牌负责人, I want 系统根据城市和线下服务场景自动找候选竞品, so that 我不用只靠手动输入品牌名称。

#### Acceptance Criteria

1. WHEN 用户进入竞品分析页面, the system SHALL 提供“地图发现竞品”入口。
2. WHEN 用户启动竞品发现, the system SHALL 读取品牌名称、经营城市、校区地址、服务年龄段、课程品类和品牌关键词作为筛选输入。
3. IF 品牌缺少经营城市或校区地址, the system SHALL 提示用户补充缺失字段并保留手动添加候选机构入口。
4. WHEN 竞品发现入口展示筛选条件, the system SHALL 默认使用全城范围，并把校区周边半径作为重点竞品筛选条件。

### Requirement 2: 地图 POI 候选获取

**User Story:** AS 品牌运营人员, I want 系统从地图中拉取线下机构候选, so that 竞品列表来自真实本地服务场景。

#### Acceptance Criteria

1. WHEN 用户确认筛选条件, the system SHALL 按经营城市检索线下机构 POI。
2. WHEN 系统检索 POI, the system SHALL 使用儿童体能、少儿跑酷、儿童运动、体适能、快乐体操、篮球培训和儿童运动馆等关键词。
3. WHEN 系统检索校区周边机构, the system SHALL 支持按每个校区 3 到 8 公里半径标记重点候选。
4. IF 地图服务返回重复 POI, the system SHALL 按名称、地址、经纬度和联系电话合并候选机构。
5. IF 地图服务不可用, the system SHALL 提供手动录入候选机构和稍后重试入口。

### Requirement 3: 候选机构评分与分类

**User Story:** AS 品牌负责人, I want 系统解释为什么某个机构像竞品, so that 我能快速判断是否勾选。

#### Acceptance Criteria

1. WHEN 系统生成候选机构, the system SHALL 为每个候选机构计算匹配分数。
2. WHEN 系统计算匹配分数, the system SHALL 使用城市匹配、校区距离、品类匹配、儿童客群匹配、搜索意图匹配和品牌档案匹配作为评分维度。
3. WHEN 候选机构位于校区 3 到 8 公里范围内, the system SHALL 标记为校区周边重点候选。
4. WHEN 候选机构属于全国连锁品牌或知名品牌, the system SHALL 允许标记为全国标杆品牌。
5. WHEN 系统展示候选机构, the system SHALL 展示机构名称、地址、距离、命中关键词、匹配理由、建议标签和置信度。

### Requirement 4: 人工勾选确认

**User Story:** AS 品牌负责人, I want 在候选列表中勾选并打标签, so that 系统只把我认可的机构纳入 GEO 监控。

#### Acceptance Criteria

1. WHEN 用户查看候选机构, the system SHALL 支持按全城候选、校区周边重点候选、建议直接竞品、建议标杆品牌和已排除过滤。
2. WHEN 用户勾选候选机构, the system SHALL 要求选择竞品确认标签。
3. WHEN 用户保存确认结果, the system SHALL 将已确认候选写入竞品档案。
4. IF 用户选择排除候选机构, the system SHALL 记录排除原因并在下一轮发现时降低展示优先级。
5. WHEN 用户修改确认标签, the system SHALL 保留操作人、操作时间、原标签和新标签。

### Requirement 5: 竞品监控衔接

**User Story:** AS 品牌运营人员, I want 确认后的竞品自动进入监测和内容策略, so that 竞品分析能影响后续 GEO 工作流。

#### Acceptance Criteria

1. WHEN 用户确认直接竞品, the system SHALL 将直接竞品纳入竞品提及率、压制率和排名差分析。
2. WHEN 用户确认校区周边重点竞品, the system SHALL 生成本地推荐和到店选择相关监测问题。
3. WHEN 用户确认全国标杆品牌, the system SHALL 将全国标杆品牌用于内容对标和品牌表达参考。
4. WHEN 系统生成监测问题, the system SHALL 区分本地直接竞品、校区周边重点竞品和全国标杆品牌。
5. WHEN 系统生成内容建议, the system SHALL 使用竞品确认标签决定对比角度和表达边界。

### Requirement 6: 数据边界与合规

**User Story:** AS 平台管理员, I want 地图竞品发现具备数据边界和审计记录, so that 外部数据接入可控可追溯。

#### Acceptance Criteria

1. WHEN 系统调用地图服务, the system SHALL 使用服务端配置的地图 API Key 并隐藏真实密钥。
2. WHEN 系统保存 POI 候选, the system SHALL 保存来源平台、来源 POI ID、名称、地址、经纬度、电话摘要、类目和更新时间。
3. WHEN 地图候选进入竞品档案, the system SHALL 保存用户确认标签和确认记录。
4. IF 候选机构信息缺少地址或城市, the system SHALL 标记为资料不足并要求用户确认。
5. WHEN 用户执行发现、确认、排除或修改标签操作, the system SHALL 写入审计日志。

## Confirmed Scope

1. 第一版竞品发现范围按经营城市全城筛选。
2. 第一版把每个校区 3 到 8 公里范围作为重点竞品筛选和标记条件。
3. 第一版保留全国连锁品牌作为全国标杆品牌候选。
4. 第一版候选竞品只包含线下机构。
5. 第一版优先接入高德地图 POI；接口层保留后续接入腾讯位置服务或百度地图的扩展点。
